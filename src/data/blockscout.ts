import type { Address } from "viem";

import type { FetchLike, HistorySample, ObservedEvent } from "../types.js";
import { errorMessage, fetchJson, isRecord } from "./http.js";
import { dedupeEvents, parseBlockscoutTokenTransfer, parseBlockscoutTransaction, parseEtherscanTransaction } from "./parse.js";

const ROOT = "https://eth.blockscout.com";

export async function readBlockscout(
  address: Address,
  sampleSize: number,
  fetchImpl?: FetchLike,
): Promise<HistorySample> {
  const recentUrl = `${ROOT}/api/v2/addresses/${address}/transactions`;
  const transferUrl = `${ROOT}/api/v2/addresses/${address}/token-transfers`;
  const countersUrl = `${ROOT}/api/v2/addresses/${address}/counters`;
  const profileUrl = `${ROOT}/api/v2/addresses/${address}`;
  const oldestUrl = `${ROOT}/api?module=account&action=txlist&address=${address}&page=1&offset=1&sort=asc`;

  const recentBody = await fetchJson(recentUrl, { fetchImpl, label: "Blockscout" });
  const [transfers, counters, profile, oldest] = await Promise.all([
    fetchJson(transferUrl, { fetchImpl, label: "Blockscout" }).catch((error: unknown) => error),
    fetchJson(countersUrl, { fetchImpl, label: "Blockscout" }).catch(() => null),
    fetchJson(profileUrl, { fetchImpl, label: "Blockscout" }).catch(() => null),
    fetchJson(oldestUrl, { fetchImpl, label: "Blockscout" }).catch(() => null),
  ]);

  const transactions = itemsOf(recentBody)
    .map(parseBlockscoutTransaction)
    .filter((event): event is ObservedEvent => event !== null)
    .slice(0, sampleSize);

  const notes: string[] = [
    "Blockscout supplied one page of recent transactions (capped by the sample size) and, when available, the earliest transaction.",
  ];

  let tokenEvents: ObservedEvent[] = [];
  if (transfers instanceof Error) {
    notes.push(`Token transfers were not loaded (${errorMessage(transfers)}).`);
  } else {
    try {
      tokenEvents = itemsOf(transfers)
        .map(parseBlockscoutTokenTransfer)
        .filter((event): event is ObservedEvent => event !== null)
        .slice(0, sampleSize);
    } catch (error) {
      notes.push(`Token transfers were not loaded (${errorMessage(error)}).`);
    }
  }

  const oldestEvent = oldestTransaction(oldest);
  if (!oldestEvent && transactions.length > 0) {
    notes.push("The earliest transaction was not available, so no first-seen date is claimed.");
  }
  const events = dedupeEvents(
    oldestEvent ? [oldestEvent, ...transactions, ...tokenEvents] : [...transactions, ...tokenEvents],
  );

  return {
    source: "blockscout",
    note: notes.join(" "),
    approxTxCount: counter(counters, "transactions_count"),
    ensName: ensName(profile),
    events,
    anchoredFirstActivity: oldestEvent !== null,
  };
}

function itemsOf(body: unknown): unknown[] {
  if (!isRecord(body) || !Array.isArray(body.items)) {
    throw new Error("Blockscout returned an unexpected payload");
  }
  return body.items;
}

function counter(body: unknown, key: string): number | null {
  if (!isRecord(body)) return null;
  const value = body[key];
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function ensName(body: unknown): string | null {
  if (!isRecord(body)) return null;
  const name = body.ens_domain_name;
  if (typeof name !== "string" || !name.includes(".")) return null;
  return name;
}

function oldestTransaction(body: unknown): ObservedEvent | null {
  if (!isRecord(body)) return null;
  const result = body.result;
  if (!Array.isArray(result) || result.length === 0) return null;
  return parseEtherscanTransaction(result[0]);
}
