import { formatEther, type Address, type Hex } from "viem";

import { interpretCode } from "./code.js";
import { DISCLAIMER } from "./constants.js";
import { redactUrl } from "./format.js";
import { collectProtocols, sawNftTransfer } from "./protocols.js";
import { buildSummary } from "./summary.js";
import { assignTags } from "./tags.js";
import { lookupLabel } from "../labels/contracts.js";
import type { HistorySample, Portrait } from "../types.js";

export type PortraitDraft = {
  address: Address;
  ensName: string | null;
  balanceWei: bigint;
  outgoingTxCount: number;
  code: Hex;
  history: HistorySample;
  rpcUrl: string | null;
  now?: Date;
};

export function buildPortrait(draft: PortraitDraft): Portrait {
  const now = draft.now ?? new Date();
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const { isContract, delegation } = interpretCode(draft.code);
  const events = draft.history.events;
  const protocols = collectProtocols(draft.address, events);
  const timestamps = events
    .map((event) => event.timestamp)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const lastUnix = timestamps.length > 0 ? Math.max(...timestamps) : null;
  const firstUnix =
    draft.history.anchoredFirstActivity && timestamps.length > 0 ? Math.min(...timestamps) : null;
  const identityLabel = lookupLabel(draft.address);
  const identity = identityLabel
    ? { protocol: identityLabel.protocol, category: identityLabel.category }
    : null;

  const stats: Portrait["stats"] = {
    balanceWei: draft.balanceWei.toString(),
    balanceEth: formatEther(draft.balanceWei),
    outgoingTxCount: draft.outgoingTxCount,
    approxTxCount: draft.history.approxTxCount,
    firstActivityAt: firstUnix === null ? null : new Date(firstUnix * 1000).toISOString(),
    lastActivityAt: lastUnix === null ? null : new Date(lastUnix * 1000).toISOString(),
    isContract,
    delegation,
    sampledTxCount: events.filter((event) => event.kind === "tx").length,
    sampledTokenTransferCount: events.filter((event) => event.kind === "token").length,
  };

  const tags = assignTags({
    balanceWei: draft.balanceWei,
    outgoingTxCount: draft.outgoingTxCount,
    approxTxCount: draft.history.approxTxCount,
    isContract,
    delegation,
    firstActivityAt: firstUnix,
    lastActivityAt: lastUnix,
    protocols,
    sawNftTransfer: sawNftTransfer(events),
    identityCategory: identity?.category ?? null,
    now: nowSeconds,
  });

  const notes = buildNotes(draft.history, delegation);
  const withoutSummary = {
    address: draft.address,
    ensName: draft.ensName,
    chain: "ethereum" as const,
    chainId: 1 as const,
    identity,
    stats,
    protocols,
    tags,
    sources: {
      rpcUrl: draft.rpcUrl ? redactUrl(draft.rpcUrl) : null,
      history: draft.history.source,
      historyNote: draft.history.note,
    },
  };

  return {
    ...withoutSummary,
    notes,
    summary: buildSummary(withoutSummary),
    generatedAt: now.toISOString(),
    disclaimer: DISCLAIMER,
  };
}

function buildNotes(history: HistorySample, delegation: Portrait["stats"]["delegation"]): string[] {
  const notes: string[] = [];
  if (history.source === "none") {
    notes.push("Explorer history was unavailable. Stats come from JSON-RPC balance, nonce, and bytecode.");
  } else {
    notes.push(
      "Activity dates and protocol hits come from a recent sample plus the earliest transaction the explorer returned. They are not a full archive.",
    );
  }
  if (history.note) notes.push(history.note);
  if (delegation) {
    notes.push(`EIP-7702 delegation target: ${delegation.implementation}.`);
  }
  notes.push("The local label map is a short curated list. Unknown contracts are simply omitted.");
  return notes;
}
