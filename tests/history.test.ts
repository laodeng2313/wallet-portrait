import { getAddress } from "viem";
import { describe, expect, it } from "vitest";

import { readHistory } from "../src/data/history.js";
import { parseBlockscoutTokenTransfer, parseBlockscoutTransaction, parseEtherscanTransaction } from "../src/data/parse.js";

const SUBJECT = getAddress("0xd8da6bf26964af9d7eed9e03e53415d37aa96045");
const UNISWAP = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("history parsers", () => {
  it("normalizes Blockscout and Etherscan rows", () => {
    const tx = parseBlockscoutTransaction({
      hash: "0xabc",
      timestamp: "2024-01-02T03:04:05.000000Z",
      from: { hash: SUBJECT },
      to: { hash: UNISWAP },
      value: "0",
    });
    expect(tx).toMatchObject({
      kind: "tx",
      hash: "0xabc",
      timestamp: Date.parse("2024-01-02T03:04:05.000Z") / 1000,
      from: SUBJECT,
      to: getAddress(UNISWAP),
    });

    const transfer = parseBlockscoutTokenTransfer({
      transaction_hash: "0xdef",
      timestamp: "2024-05-01T00:00:00.000Z",
      from: { hash: SUBJECT },
      to: { hash: "0x0000000000000000000000000000000000000000" },
      token: { address_hash: "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85", type: "ERC-721" },
      token_type: "ERC-721",
    });
    expect(transfer?.tokenStandard).toBe("ERC-721");
    expect(transfer?.to).toBeNull();

    const scan = parseEtherscanTransaction({
      hash: "0x1",
      from: SUBJECT.toLowerCase(),
      to: UNISWAP.toLowerCase(),
      timeStamp: "1443428683",
      value: "1",
    });
    expect(scan?.timestamp).toBe(1_443_428_683);
    expect(scan?.to).toBe(getAddress(UNISWAP));
    expect(parseEtherscanTransaction({ hash: 12 })).toBeNull();
  });
});

describe("readHistory", () => {
  it("builds a Blockscout sample without an API key", async () => {
    const fetchImpl = async (url: string): Promise<Response> => {
      if (url.endsWith("/transactions")) {
        return json({
          items: [
            {
              hash: "0xnew",
              timestamp: "2026-01-01T00:00:00.000Z",
              from: { hash: SUBJECT },
              to: { hash: UNISWAP },
            },
          ],
        });
      }
      if (url.includes("/token-transfers")) {
        return json({
          items: [
            {
              transaction_hash: "0xnft",
              timestamp: "2026-01-02T00:00:00.000Z",
              from: { hash: SUBJECT },
              to: { hash: "0x1111111111111111111111111111111111111111" },
              token: { address_hash: "0x2222222222222222222222222222222222222222", type: "ERC-721" },
              token_type: "ERC-721",
            },
          ],
        });
      }
      if (url.includes("/counters")) return json({ transactions_count: "78427" });
      if (url.includes("module=account")) {
        return json({
          status: "1",
          message: "OK",
          result: [
            {
              hash: "0xold",
              from: "0x1db3439a222c519ab44bb1144fc28167b4fa6ee6",
              to: SUBJECT,
              timeStamp: "1443428683",
              value: "1",
            },
          ],
        });
      }
      if (url.endsWith(SUBJECT)) return json({ ens_domain_name: "vitalik.eth" });
      return json({ unexpected: true }, 500);
    };

    const sample = await readHistory(SUBJECT, { sampleSize: 10, fetchImpl });
    expect(sample.source).toBe("blockscout");
    expect(sample.approxTxCount).toBe(78427);
    expect(sample.ensName).toBe("vitalik.eth");
    expect(sample.anchoredFirstActivity).toBe(true);
    expect(sample.events.map((event) => event.hash)).toEqual(["0xold", "0xnew", "0xnft"]);
    expect(sample.note).toMatch(/Blockscout/);
  });

  it("falls back to Blockscout when Etherscan fails, and to RPC-only when both fail", async () => {
    const blockscoutUp = async (url: string): Promise<Response> => {
      if (url.includes("etherscan.io")) return json({ status: "0", message: "NOTOK", result: "Invalid API Key" });
      if (url.endsWith("/transactions")) return json({ items: [] });
      if (url.includes("/token-transfers")) return json({ items: [] });
      if (url.includes("/counters")) return json({ transactions_count: "0" });
      if (url.includes("module=account")) return json({ status: "1", result: [] });
      return json({ ens_domain_name: null });
    };

    const fallback = await readHistory(SUBJECT, { sampleSize: 5, etherscanApiKey: "test-key", fetchImpl: blockscoutUp });
    expect(fallback.source).toBe("blockscout");
    expect(fallback.note).toMatch(/Etherscan failed/);
    expect(fallback.anchoredFirstActivity).toBe(false);

    const down = async (): Promise<Response> => json({ message: "no" }, 503);
    const empty = await readHistory(SUBJECT, { sampleSize: 5, fetchImpl: down });
    expect(empty.source).toBe("none");
    expect(empty.events).toEqual([]);
    expect(empty.note).toMatch(/Blockscout was unreachable/);
    expect(empty.anchoredFirstActivity).toBe(false);
  });
});
