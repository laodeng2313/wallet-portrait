import { formatEthDisplay, formatIsoDate, joinList, shortAddress } from "./format.js";
import type { Portrait } from "../types.js";

type SummaryInput = Omit<Portrait, "summary" | "generatedAt" | "disclaimer" | "notes">;

export function buildSummary(portrait: SummaryInput): string {
  const who = portrait.ensName
    ? `${shortAddress(portrait.address)} (${portrait.ensName})`
    : shortAddress(portrait.address);
  const kind = portrait.stats.delegation
    ? "delegated account (EIP-7702)"
    : portrait.stats.isContract
      ? "contract"
      : "account";
  const outgoing = portrait.stats.outgoingTxCount;
  const outgoingLabel = `${outgoing.toLocaleString("en-US")} outgoing transaction${outgoing === 1 ? "" : "s"}`;
  const balance = formatEthDisplay(BigInt(portrait.stats.balanceWei));

  const sentences: string[] = [];
  if (portrait.identity) {
    sentences.push(
      `${who} matches the local label ${portrait.identity.protocol} (${portrait.identity.category}). It is a ${kind} on Ethereum mainnet holding about ${balance} ETH, with ${outgoingLabel}.`,
    );
  } else {
    sentences.push(
      `${who} is a ${kind} on Ethereum mainnet holding about ${balance} ETH, with ${outgoingLabel}.`,
    );
  }

  if (portrait.stats.firstActivityAt && portrait.stats.lastActivityAt) {
    const span = `Sampled activity runs from ${formatIsoDate(portrait.stats.firstActivityAt)} to ${formatIsoDate(portrait.stats.lastActivityAt)}`;
    if (portrait.stats.approxTxCount !== null) {
      sentences.push(
        `${span}, and an explorer reports about ${portrait.stats.approxTxCount.toLocaleString("en-US")} transactions in total.`,
      );
    } else {
      sentences.push(`${span}.`);
    }
  } else if (portrait.stats.lastActivityAt) {
    sentences.push(`Most recent sampled activity is ${formatIsoDate(portrait.stats.lastActivityAt)}. The earliest transaction was not available.`);
  } else if (portrait.sources.history === "none") {
    sentences.push("No transaction history could be loaded, so this reading is limited to balance, nonce, and bytecode.");
  }

  const protocols = portrait.protocols.filter((item) => item.category !== "token").slice(0, 4);
  const tokens = portrait.protocols.filter((item) => item.category === "token").slice(0, 3);
  if (protocols.length > 0) {
    sentences.push(`Labeled protocols in the sample include ${joinList(protocols.map((item) => item.protocol))}.`);
  }
  if (tokens.length > 0) {
    sentences.push(`Labeled tokens include ${joinList(tokens.map((item) => item.protocol))}.`);
  }
  if (portrait.tags.length > 0) {
    sentences.push(`Heuristic tags: ${portrait.tags.map((tag) => tag.id).join(", ")}.`);
  }
  return sentences.join(" ");
}
