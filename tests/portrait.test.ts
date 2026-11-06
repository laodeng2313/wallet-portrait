import { getAddress } from "viem";
import { describe, expect, it } from "vitest";

import { analyzeAddress } from "../src/core/analyze.js";
import { formatPortrait } from "../src/cli/format.js";
import { buildPortrait } from "../src/core/portrait.js";
import type { HistorySample, ObservedEvent } from "../src/types.js";

const SUBJECT = getAddress("0xd8da6bf26964af9d7eed9e03e53415d37aa96045");
const UNISWAP = getAddress("0x7a250d5630b4cf539739df2c5dacb4c659f2488d");
const USDC = getAddress("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
const NOW = new Date("2026-01-15T00:00:00.000Z");
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);

function tx(partial: Partial<ObservedEvent> & Pick<ObservedEvent, "from" | "to" | "timestamp">): ObservedEvent {
  return {
    kind: "tx",
    hash: "0xabc",
    token: null,
    tokenStandard: null,
    ...partial,
  };
}

function history(events: ObservedEvent[], overrides: Partial<HistorySample> = {}): HistorySample {
  return {
    source: "blockscout",
    note: "sample",
    approxTxCount: 40,
    ensName: "vitalik.eth",
    events,
    anchoredFirstActivity: true,
    ...overrides,
  };
}

describe("buildPortrait", () => {
  it("shapes a JSON-safe portrait with protocols, tags, and a summary", () => {
    const portrait = buildPortrait({
      address: SUBJECT,
      ensName: "vitalik.eth",
      balanceWei: 2n * 10n ** 18n,
      outgoingTxCount: 12,
      code: "0x",
      rpcUrl: "https://rpc.test/v1",
      now: NOW,
      history: history([
        tx({
          hash: "0x1",
          from: SUBJECT,
          to: UNISWAP,
          timestamp: NOW_SECONDS - 800 * 86_400,
        }),
        tx({
          hash: "0x1b",
          from: SUBJECT,
          to: UNISWAP,
          timestamp: NOW_SECONDS - 3 * 86_400,
        }),
        {
          kind: "token",
          hash: "0x2",
          timestamp: NOW_SECONDS - 2 * 86_400,
          from: SUBJECT,
          to: getAddress("0x1111111111111111111111111111111111111111"),
          token: USDC,
          tokenStandard: "ERC-20",
        },
        {
          kind: "token",
          hash: "0x3",
          timestamp: NOW_SECONDS - 86_400,
          from: SUBJECT,
          to: null,
          token: getAddress("0x2222222222222222222222222222222222222222"),
          tokenStandard: "ERC-721",
        },
      ]),
    });

    expect(portrait.address).toBe(SUBJECT);
    expect(portrait.chain).toBe("ethereum");
    expect(portrait.chainId).toBe(1);
    expect(portrait.ensName).toBe("vitalik.eth");
    expect(portrait.stats.balanceWei).toBe((2n * 10n ** 18n).toString());
    expect(portrait.stats.balanceEth).toBe("2");
    expect(portrait.stats.sampledTxCount).toBe(2);
    expect(portrait.stats.sampledTokenTransferCount).toBe(2);
    expect(portrait.stats.firstActivityAt).toBe(new Date((NOW_SECONDS - 800 * 86_400) * 1000).toISOString());
    expect(portrait.protocols.map((item) => item.protocol)).toEqual(["Uniswap", "USDC"]);
    expect(portrait.protocols[0]?.hits).toBe(2);
    expect(portrait.tags.map((tag) => tag.id)).toEqual(expect.arrayContaining(["active", "defi-user", "nft-touched"]));
    expect(portrait.summary).toMatch(/vitalik\.eth/);
    expect(portrait.summary).toMatch(/Uniswap/);
    expect(portrait.summary).toMatch(/USDC/);
    expect(portrait.disclaimer).toMatch(/not a risk score/i);
    expect(portrait.generatedAt).toBe(NOW.toISOString());
    expect(JSON.stringify(portrait)).not.toMatch(/undefined/);
    expect(JSON.parse(JSON.stringify(portrait)).address).toBe(SUBJECT);
    expect(formatPortrait(portrait)).toMatch(/Wallet portrait/);
    expect(formatPortrait(portrait)).toMatch(/defi-user/);
  });

  it("does not treat a recent page as the wallet's first activity", () => {
    const portrait = buildPortrait({
      address: SUBJECT,
      ensName: null,
      balanceWei: 0n,
      outgoingTxCount: 1,
      code: "0x",
      rpcUrl: null,
      now: NOW,
      history: history(
        [
          tx({
            from: SUBJECT,
            to: UNISWAP,
            timestamp: Math.floor(NOW.getTime() / 1000) - 86_400,
          }),
        ],
        { anchoredFirstActivity: false, approxTxCount: 2, ensName: null },
      ),
    });
    expect(portrait.stats.firstActivityAt).toBeNull();
    expect(portrait.stats.lastActivityAt).not.toBeNull();
    expect(portrait.tags.map((tag) => tag.id)).not.toContain("new-wallet");
    expect(portrait.summary).toMatch(/earliest transaction was not available/i);
  });

  it("recognizes an EIP-7702 delegation and a labeled contract", () => {
    const router = buildPortrait({
      address: UNISWAP,
      ensName: null,
      balanceWei: 0n,
      outgoingTxCount: 1,
      code: "0x6001600c",
      rpcUrl: null,
      now: NOW,
      history: history([], { ensName: null, approxTxCount: null, source: "none", anchoredFirstActivity: false }),
    });
    expect(router.identity).toEqual({ protocol: "Uniswap", category: "dex" });
    expect(router.stats.isContract).toBe(true);
    expect(router.summary).toMatch(/local label Uniswap/);

    const delegated = buildPortrait({
      address: SUBJECT,
      ensName: null,
      balanceWei: 5n * 10n ** 17n,
      outgoingTxCount: 4,
      code: "0xef01005a7fc11397e9a8ad41bf10bf13f22b0a63f96f6d",
      rpcUrl: null,
      now: NOW,
      history: history([], { source: "none", note: "rpc only", ensName: null, approxTxCount: null, anchoredFirstActivity: false }),
    });
    expect(delegated.stats.isContract).toBe(false);
    expect(delegated.stats.delegation?.standard).toBe("eip-7702");
    expect(delegated.stats.delegation?.implementation).toBe("0x5A7FC11397E9a8AD41BF10bf13F22B0a63f96f6d");
    expect(delegated.tags.map((tag) => tag.id)).toContain("delegated-eoa");
    expect(delegated.sources.history).toBe("none");
    expect(delegated.summary).toMatch(/balance, nonce, and bytecode/);
  });
});

describe("analyzeAddress", () => {
  it("validates before calling injected clients and resolves ENS through them", async () => {
    let calls = 0;
    await expect(
      analyzeAddress("0x1234", {
        clients: {
          readAccount: async () => {
            calls += 1;
            throw new Error("should not run");
          },
          readHistory: async () => {
            throw new Error("should not run");
          },
        },
      }),
    ).rejects.toThrow(/40 hex/);
    expect(calls).toBe(0);

    const portrait = await analyzeAddress("Vitalik.eth", {
      now: NOW,
      clients: {
        resolveName: async (name) => {
          expect(name).toBe("vitalik.eth");
          return SUBJECT;
        },
        readAccount: async () => ({
          balanceWei: 1n,
          outgoingTxCount: 0,
          code: "0x",
          ensName: null,
          rpcUrl: "https://user:secret@rpc.test/path?apiKey=abc",
        }),
        readHistory: async () => history([], { ensName: null, approxTxCount: 0, events: [] }),
      },
    });
    expect(portrait.address).toBe(SUBJECT);
    expect(portrait.ensName).toBe("vitalik.eth");
    expect(portrait.sources.rpcUrl).toBe("https://rpc.test/path?apiKey=redacted");
  });
});
