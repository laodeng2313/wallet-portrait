import {
  ACTIVE_WINDOW_DAYS,
  BURST_MIN_OUTGOING,
  BURST_WINDOW_DAYS,
  DAY_SECONDS,
  DORMANT_AFTER_DAYS,
  HIGH_BALANCE_WEI,
  NEW_WALLET_MAX_APPROX_TX,
  NEW_WALLET_MAX_OUTGOING,
  NEW_WALLET_WINDOW_DAYS,
} from "./constants.js";
import type { Delegation, PortraitTag, ProtocolCategory, ProtocolTouch, TagId } from "../types.js";

const TAG_LABELS: Record<TagId, string> = {
  active: "Active",
  dormant: "Dormant",
  "new-wallet": "New wallet",
  empty: "Empty",
  contract: "Contract",
  "delegated-eoa": "Delegated account",
  "defi-user": "DeFi user",
  "nft-touched": "NFT touched",
  "exchange-touched": "Exchange touched",
  "bridge-touched": "Bridge touched",
  "high-balance": "High ETH balance",
  "high-risk-heuristics": "High-risk heuristics",
};

const TAG_ORDER: readonly TagId[] = [
  "contract",
  "delegated-eoa",
  "empty",
  "new-wallet",
  "active",
  "dormant",
  "high-balance",
  "defi-user",
  "nft-touched",
  "exchange-touched",
  "bridge-touched",
  "high-risk-heuristics",
];

const DEFI_CATEGORIES = new Set<ProtocolCategory>(["dex", "lending", "staking"]);

export type TagInput = {
  balanceWei: bigint;
  outgoingTxCount: number;
  approxTxCount: number | null;
  isContract: boolean;
  delegation: Delegation | null;
  firstActivityAt: number | null;
  lastActivityAt: number | null;
  protocols: readonly ProtocolTouch[];
  sawNftTransfer: boolean;
  identityCategory: ProtocolCategory | null;
  /** Unix seconds. */
  now: number;
};

export function assignTags(input: TagInput): PortraitTag[] {
  const found = new Map<TagId, string>();
  const noActivity =
    input.outgoingTxCount === 0 &&
    input.balanceWei === 0n &&
    input.firstActivityAt === null &&
    input.lastActivityAt === null;

  if (input.isContract) {
    found.set("contract", "The address has deployed bytecode and is not an EIP-7702 delegation.");
  }
  if (input.delegation) {
    found.set(
      "delegated-eoa",
      `Bytecode is an EIP-7702 delegation to ${input.delegation.implementation}. The account is still an EOA.`,
    );
  }
  if (noActivity && !input.isContract) {
    found.set("empty", "Zero ETH, nonce 0, and no transactions in the sample.");
  }

  const ageKnown = input.firstActivityAt !== null;
  const young =
    ageKnown && input.now - (input.firstActivityAt ?? 0) <= NEW_WALLET_WINDOW_DAYS * DAY_SECONDS;
  const smallHistory = input.approxTxCount === null || input.approxTxCount <= NEW_WALLET_MAX_APPROX_TX;
  if (
    !input.isContract &&
    !found.has("empty") &&
    young &&
    input.outgoingTxCount <= NEW_WALLET_MAX_OUTGOING &&
    smallHistory
  ) {
    found.set(
      "new-wallet",
      `First sampled activity is within ${NEW_WALLET_WINDOW_DAYS} days, with at most ${NEW_WALLET_MAX_OUTGOING} outgoing transactions.`,
    );
  }

  if (input.lastActivityAt !== null && input.now - input.lastActivityAt <= ACTIVE_WINDOW_DAYS * DAY_SECONDS) {
    found.set("active", `Last sampled activity is within ${ACTIVE_WINDOW_DAYS} days.`);
  } else if (
    input.lastActivityAt !== null &&
    input.now - input.lastActivityAt > DORMANT_AFTER_DAYS * DAY_SECONDS
  ) {
    found.set("dormant", `Last sampled activity is more than ${DORMANT_AFTER_DAYS} days old.`);
  }

  if (input.balanceWei >= HIGH_BALANCE_WEI) {
    found.set("high-balance", "Native balance is at least 100 ETH. This is a display threshold, not a judgment.");
  }

  const defi = uniqueProtocols(input.protocols, (category) => DEFI_CATEGORIES.has(category));
  if (defi.length > 0) {
    found.set(
      "defi-user",
      `Sampled activity touches labeled DeFi contracts: ${defi.join(", ")}.`,
    );
  }

  const nft = uniqueProtocols(input.protocols, (category) => category === "nft");
  if (nft.length > 0) {
    found.set("nft-touched", `Sampled activity touches labeled NFT markets: ${nft.join(", ")}.`);
  } else if (input.sawNftTransfer) {
    found.set("nft-touched", "The sample includes an ERC-721 or ERC-1155 transfer.");
  }

  const exchanges = uniqueProtocols(input.protocols, (category) => category === "exchange");
  if (exchanges.length > 0) {
    found.set("exchange-touched", `Sampled activity touches labeled exchange addresses: ${exchanges.join(", ")}.`);
  }

  const bridges = uniqueProtocols(input.protocols, (category) => category === "bridge");
  if (bridges.length > 0) {
    found.set("bridge-touched", `Sampled activity touches labeled bridge contracts: ${bridges.join(", ")}.`);
  }

  const mixers = uniqueProtocols(input.protocols, (category) => category === "mixer");
  const selfMixer = input.identityCategory === "mixer";
  const burst =
    input.firstActivityAt !== null &&
    input.lastActivityAt !== null &&
    input.lastActivityAt - input.firstActivityAt <= BURST_WINDOW_DAYS * DAY_SECONDS &&
    input.outgoingTxCount >= BURST_MIN_OUTGOING;
  const risk: string[] = [];
  if (selfMixer || mixers.length > 0) {
    risk.push(
      "A sampled counterparty, or this address itself, is in the local mixer list (Tornado Cash contracts).",
    );
  }
  if (burst) {
    risk.push(
      `At least ${BURST_MIN_OUTGOING} outgoing transactions fall inside the ${BURST_WINDOW_DAYS} days between the first and last sampled activity.`,
    );
  }
  if (risk.length > 0) {
    found.set("high-risk-heuristics", `${risk.join(" ")} Heuristic only — not a risk score.`);
  }

  return TAG_ORDER.flatMap((id) => {
    const reason = found.get(id);
    if (!reason) return [];
    return [{ id, label: TAG_LABELS[id], reason }];
  });
}

function uniqueProtocols(
  protocols: readonly ProtocolTouch[],
  include: (category: ProtocolCategory) => boolean,
): string[] {
  const names: string[] = [];
  for (const protocol of protocols) {
    if (!include(protocol.category) || names.includes(protocol.protocol)) continue;
    names.push(protocol.protocol);
  }
  return names;
}
