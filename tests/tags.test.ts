import { describe, expect, it } from "vitest";

import { HIGH_BALANCE_WEI } from "../src/core/constants.js";
import { assignTags } from "../src/core/tags.js";
import type { ProtocolTouch, TagId } from "../src/types.js";

const NOW = 1_700_000_000;
const DAY = 86_400;

function tags(overrides: Partial<Parameters<typeof assignTags>[0]> = {}): TagId[] {
  return assignTags({
    balanceWei: 10n ** 18n,
    outgoingTxCount: 3,
    approxTxCount: 3,
    isContract: false,
    delegation: null,
    firstActivityAt: NOW - 10 * DAY,
    lastActivityAt: NOW - 2 * DAY,
    protocols: [],
    sawNftTransfer: false,
    identityCategory: null,
    now: NOW,
    ...overrides,
  }).map((tag) => tag.id);
}

function touch(protocol: string, category: ProtocolTouch["category"]): ProtocolTouch {
  return { protocol, category, addresses: ["0x0000000000000000000000000000000000000001"], hits: 2 };
}

describe("assignTags", () => {
  it("marks recent activity as active and year-old activity as dormant", () => {
    expect(tags()).toContain("active");
    expect(tags()).not.toContain("dormant");
    const dormant = tags({ lastActivityAt: NOW - 400 * DAY, firstActivityAt: NOW - 800 * DAY });
    expect(dormant).toContain("dormant");
    expect(dormant).not.toContain("active");
  });

  it("marks a young, small wallet as new and refuses the tag without an anchored first date", () => {
    expect(tags({ outgoingTxCount: 1, approxTxCount: 2 })).toContain("new-wallet");
    expect(tags({ firstActivityAt: null, lastActivityAt: NOW - DAY, outgoingTxCount: 1 })).not.toContain("new-wallet");
    expect(tags({ approxTxCount: 80, outgoingTxCount: 1 })).not.toContain("new-wallet");
    expect(tags({ firstActivityAt: NOW - 200 * DAY, lastActivityAt: NOW - 190 * DAY, outgoingTxCount: 1 })).not.toContain(
      "new-wallet",
    );
  });

  it("marks an untouched zero-balance address as empty, not new", () => {
    const empty = tags({
      balanceWei: 0n,
      outgoingTxCount: 0,
      approxTxCount: 0,
      firstActivityAt: null,
      lastActivityAt: null,
    });
    expect(empty).toEqual(["empty"]);
  });

  it("separates contracts from EIP-7702 delegations", () => {
    expect(tags({ isContract: true })).toContain("contract");
    const delegated = tags({
      delegation: { standard: "eip-7702", implementation: "0x5A7FC11397E9a8AD41BF10bf13F22B0a63f96f6d" },
    });
    expect(delegated).toContain("delegated-eoa");
    expect(delegated).not.toContain("contract");
  });

  it("tags labeled protocols and nft transfers", () => {
    const ids = tags({
      protocols: [touch("Uniswap", "dex"), touch("Aave", "lending"), touch("OpenSea", "nft"), touch("Hop", "bridge"), touch("Binance", "exchange")],
    });
    expect(ids).toEqual(expect.arrayContaining(["defi-user", "nft-touched", "bridge-touched", "exchange-touched"]));
    const reasons = assignTags({
      balanceWei: 1n,
      outgoingTxCount: 3,
      approxTxCount: 3,
      isContract: false,
      delegation: null,
      firstActivityAt: NOW - 10 * DAY,
      lastActivityAt: NOW - DAY,
      protocols: [touch("Uniswap", "dex"), touch("Aave", "lending")],
      sawNftTransfer: false,
      identityCategory: null,
      now: NOW,
    }).find((tag) => tag.id === "defi-user");
    expect(reasons?.reason).toMatch(/Uniswap/);
    expect(reasons?.reason).toMatch(/Aave/);

    expect(tags({ sawNftTransfer: true })).toContain("nft-touched");
    expect(tags({ protocols: [touch("USDC", "token")] })).not.toContain("defi-user");
  });

  it("uses 100 ETH as the high-balance threshold", () => {
    expect(tags({ balanceWei: HIGH_BALANCE_WEI })).toContain("high-balance");
    expect(tags({ balanceWei: HIGH_BALANCE_WEI - 1n })).not.toContain("high-balance");
  });

  it("applies the mixer and burst heuristics without treating an old busy wallet as a burst", () => {
    const mixer = tags({ protocols: [touch("Tornado Cash", "mixer")] });
    expect(mixer).toContain("high-risk-heuristics");

    const self = tags({ identityCategory: "mixer", protocols: [] });
    expect(self).toContain("high-risk-heuristics");

    const burst = tags({
      outgoingTxCount: 40,
      firstActivityAt: NOW - 6 * DAY,
      lastActivityAt: NOW - DAY,
      approxTxCount: 40,
    });
    expect(burst).toContain("high-risk-heuristics");

    const seasoned = tags({
      outgoingTxCount: 4_000,
      firstActivityAt: NOW - 400 * DAY,
      lastActivityAt: NOW - DAY,
    });
    expect(seasoned).not.toContain("high-risk-heuristics");
    expect(assignTags({
      balanceWei: 1n,
      outgoingTxCount: 40,
      approxTxCount: 40,
      isContract: false,
      delegation: null,
      firstActivityAt: NOW - 6 * DAY,
      lastActivityAt: NOW - DAY,
      protocols: [touch("Tornado Cash", "mixer")],
      sawNftTransfer: false,
      identityCategory: null,
      now: NOW,
    }).find((tag) => tag.id === "high-risk-heuristics")?.reason).toMatch(/not a risk score/i);
  });
});
