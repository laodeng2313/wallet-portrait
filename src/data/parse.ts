import { toAddress } from "../core/address.js";
import type { ObservedEvent, TokenStandard } from "../types.js";
import { isRecord } from "./http.js";

export function parseBlockscoutTransaction(value: unknown): ObservedEvent | null {
  if (!isRecord(value) || typeof value.hash !== "string") return null;
  return {
    kind: "tx",
    hash: typeof value.hash === "string" ? value.hash : null,
    timestamp: parseTimestamp(value.timestamp),
    from: partyAddress(value.from),
    to: partyAddress(value.to),
    token: null,
    tokenStandard: null,
  };
}

export function parseBlockscoutTokenTransfer(value: unknown): ObservedEvent | null {
  if (!isRecord(value)) return null;
  const hash = value.transaction_hash;
  if (hash !== undefined && hash !== null && typeof hash !== "string") return null;
  const token = isRecord(value.token) ? value.token : null;
  return {
    kind: "token",
    hash: typeof value.transaction_hash === "string" ? value.transaction_hash : null,
    timestamp: parseTimestamp(value.timestamp),
    from: partyAddress(value.from),
    to: partyAddress(value.to),
    token: token ? toAddress(token.address_hash ?? token.address) : null,
    tokenStandard: asStandard(value.token_type ?? token?.type),
  };
}

export function parseEtherscanTransaction(value: unknown): ObservedEvent | null {
  if (!isRecord(value) || typeof value.hash !== "string") return null;
  return {
    kind: "tx",
    hash: typeof value.hash === "string" ? value.hash : null,
    timestamp: parseUnixSeconds(value.timeStamp),
    from: toAddress(value.from),
    to: toAddress(value.to),
    token: null,
    tokenStandard: null,
  };
}

export function parseEtherscanTokenTransfer(value: unknown, standard: TokenStandard): ObservedEvent | null {
  if (!isRecord(value) || typeof value.hash !== "string") return null;
  return {
    kind: "token",
    hash: typeof value.hash === "string" ? value.hash : null,
    timestamp: parseUnixSeconds(value.timeStamp),
    from: toAddress(value.from),
    to: toAddress(value.to),
    token: toAddress(value.contractAddress),
    tokenStandard: standard,
  };
}

export function dedupeEvents(events: readonly ObservedEvent[]): ObservedEvent[] {
  const seen = new Set<string>();
  const unique: ObservedEvent[] = [];
  for (const event of events) {
    const key = [event.kind, event.hash ?? "", event.from ?? "", event.to ?? "", event.token ?? ""].join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(event);
  }
  return unique;
}

function partyAddress(value: unknown): ObservedEvent["from"] {
  if (typeof value === "string") return toAddress(value);
  if (!isRecord(value)) return null;
  return toAddress(value.hash);
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || !value) return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1000);
}

function parseUnixSeconds(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const seconds = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.floor(seconds);
}

function asStandard(value: unknown): TokenStandard | null {
  if (value === "ERC-20" || value === "ERC-721" || value === "ERC-1155") return value;
  return null;
}
