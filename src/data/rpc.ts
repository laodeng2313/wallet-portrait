import { createPublicClient, http, type Address, type Hex } from "viem";
import { mainnet } from "viem/chains";

import { DEFAULT_RPC_URLS, USER_AGENT } from "../core/constants.js";
import { PortraitError } from "../core/errors.js";
import { redactUrl } from "../core/format.js";
import type { AccountSnapshot } from "../types.js";

export async function readAccount(address: Address, preferred?: string): Promise<AccountSnapshot> {
  const urls = unique([preferred?.trim(), ...DEFAULT_RPC_URLS].filter((url): url is string => Boolean(url)));
  const failures: string[] = [];
  for (const url of urls) {
    try {
      return await readAccountFrom(url, address);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${redactUrl(url)}: ${message}`);
    }
  }
  throw new PortraitError(
    `Could not reach an Ethereum RPC.\n${failures.join("\n")}\nSet RPC_URL to a working endpoint.`,
    2,
  );
}

export async function resolveEns(name: string, preferred?: string): Promise<Address> {
  const urls = unique([preferred?.trim(), ...DEFAULT_RPC_URLS].filter((url): url is string => Boolean(url)));
  const failures: string[] = [];
  for (const url of urls) {
    try {
      const client = clientFor(url);
      const address = await client.getEnsAddress({ name });
      if (!address) {
        throw new PortraitError(`No Ethereum address is set for ${name}.`);
      }
      return address;
    } catch (error) {
      if (error instanceof PortraitError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${redactUrl(url)}: ${message}`);
    }
  }
  throw new PortraitError(
    `Could not resolve ${name}.\n${failures.join("\n")}\nPass a 0x address, or set RPC_URL to a node that supports ENS.`,
    1,
  );
}

async function readAccountFrom(url: string, address: Address): Promise<AccountSnapshot> {
  const client = clientFor(url);
  const [balanceWei, outgoingTxCount, code, ensName] = await Promise.all([
    client.getBalance({ address }),
    client.getTransactionCount({ address }),
    client.getCode({ address }),
    withTimeout(client.getEnsName({ address }).catch(() => null), 4_000, null),
  ]);
  return {
    balanceWei,
    outgoingTxCount,
    code: code as Hex,
    ensName,
    rpcUrl: redactUrl(url),
  };
}

function clientFor(url: string) {
  const headers: Record<string, string> = {};
  if (!("document" in globalThis)) headers["User-Agent"] = USER_AGENT;
  return createPublicClient({
    chain: mainnet,
    transport: http(url, {
      timeout: 8_000,
      retryCount: 0,
      fetchOptions: { headers },
    }),
  });
}

function unique(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
