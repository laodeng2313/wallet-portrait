import type { Address } from "viem";

import type { FetchLike, HistorySample, ObservedEvent, TokenStandard } from "../types.js";
import { fetchJson, isRecord } from "./http.js";
import { dedupeEvents, parseEtherscanTokenTransfer, parseEtherscanTransaction } from "./parse.js";

export async function readEtherscan(
  address: Address,
  apiKey: string,
  sampleSize: number,
  fetchImpl?: FetchLike,
): Promise<HistorySample> {
  const [recent, oldest, erc20, erc721, erc1155] = await Promise.all([
    etherscanCall(
      { module: "account", action: "txlist", address, page: "1", offset: String(sampleSize), sort: "desc" },
      apiKey,
      fetchImpl,
    ),
    optionalEtherscan(
      { module: "account", action: "txlist", address, page: "1", offset: "1", sort: "asc" },
      apiKey,
      fetchImpl,
    ),
    optionalEtherscan(
      { module: "account", action: "tokentx", address, page: "1", offset: String(sampleSize), sort: "desc" },
      apiKey,
      fetchImpl,
    ),
    optionalEtherscan(
      { module: "account", action: "tokennfttx", address, page: "1", offset: String(sampleSize), sort: "desc" },
      apiKey,
      fetchImpl,
    ),
    optionalEtherscan(
      { module: "account", action: "token1155tx", address, page: "1", offset: String(sampleSize), sort: "desc" },
      apiKey,
      fetchImpl,
    ),
  ]);

  const transactions = recent
    .map(parseEtherscanTransaction)
    .filter((event): event is ObservedEvent => event !== null)
    .slice(0, sampleSize);
  const oldestEvent =
    oldest?.map(parseEtherscanTransaction).find((event): event is ObservedEvent => event !== null) ?? null;
  const tokens = [
    ...mapTokens(erc20 ?? [], "ERC-20"),
    ...mapTokens(erc721 ?? [], "ERC-721"),
    ...mapTokens(erc1155 ?? [], "ERC-1155"),
  ].slice(0, sampleSize);

  const note = oldestEvent
    ? "Etherscan supplied a recent sample plus the earliest transaction it returned. Totals are not included on this path."
    : "Etherscan supplied a recent sample. The earliest transaction was not available, so no first-seen date is claimed. Totals are not included on this path.";

  return {
    source: "etherscan",
    note,
    approxTxCount: null,
    ensName: null,
    events: dedupeEvents(oldestEvent ? [oldestEvent, ...transactions, ...tokens] : [...transactions, ...tokens]),
    anchoredFirstActivity: oldestEvent !== null,
  };
}

async function optionalEtherscan(
  params: Record<string, string>,
  apiKey: string,
  fetchImpl?: FetchLike,
): Promise<unknown[] | null> {
  try {
    return await etherscanCall(params, apiKey, fetchImpl);
  } catch {
    return null;
  }
}

async function etherscanCall(
  params: Record<string, string>,
  apiKey: string,
  fetchImpl?: FetchLike,
): Promise<unknown[]> {
  const query = new URLSearchParams({ chainid: "1", ...params, apikey: apiKey });
  const url = `https://api.etherscan.io/v2/api?${query.toString()}`;
  const body = await fetchJson(url, { fetchImpl, label: "Etherscan" });
  if (!isRecord(body)) throw new Error("Etherscan returned an unexpected payload");
  const result = body.result;
  if (typeof result === "string") {
    if (/no transactions found/i.test(result) || /no records found/i.test(result)) return [];
    const message = typeof body.message === "string" ? body.message : "Etherscan request failed";
    throw new Error(`${message}: ${result}`);
  }
  if (!Array.isArray(result)) throw new Error("Etherscan returned an unexpected payload");
  if (body.status === "0" && result.length === 0) return [];
  return result;
}

function mapTokens(rows: unknown[], standard: TokenStandard): ObservedEvent[] {
  return rows
    .map((row) => parseEtherscanTokenTransfer(row, standard))
    .filter((event): event is ObservedEvent => event !== null);
}
