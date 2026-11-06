import { getAddress } from "viem";

import { looksLikeEnsName, validateAddress } from "./address.js";
import { DEFAULT_SAMPLE_SIZE } from "./constants.js";
import { PortraitError } from "./errors.js";
import { buildPortrait } from "./portrait.js";
import { readHistory } from "../data/history.js";
import { readAccount, resolveEns } from "../data/rpc.js";
import type { AnalyzeOptions, Portrait } from "../types.js";

export async function analyzeAddress(input: string, options: AnalyzeOptions = {}): Promise<Portrait> {
  const sampleSize = clampSample(options.sampleSize ?? DEFAULT_SAMPLE_SIZE);
  const trimmed = input.trim();
  let ensFromInput: string | null = null;
  let address: `0x${string}`;

  if (looksLikeEnsName(trimmed)) {
    const name = trimmed.toLowerCase();
    ensFromInput = name;
    address = options.clients?.resolveName
      ? getAddress(await options.clients.resolveName(name))
      : await resolveEns(name, options.rpcUrl);
  } else {
    const validated = validateAddress(trimmed);
    if (!validated.ok) throw new PortraitError(validated.error);
    address = validated.address;
  }

  const account = options.clients
    ? await options.clients.readAccount(address)
    : await readAccount(address, options.rpcUrl);
  const history = options.clients
    ? await options.clients.readHistory(address)
    : await readHistory(address, {
        sampleSize,
        ...(options.etherscanApiKey ? { etherscanApiKey: options.etherscanApiKey } : {}),
        ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
      });

  const ensName = ensFromInput ?? history.ensName ?? account.ensName;

  return buildPortrait({
    address,
    ensName,
    balanceWei: account.balanceWei,
    outgoingTxCount: account.outgoingTxCount,
    code: account.code,
    history,
    rpcUrl: account.rpcUrl,
    ...(options.now ? { now: options.now } : {}),
  });
}

function clampSample(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SAMPLE_SIZE;
  return Math.min(50, Math.max(1, Math.floor(value)));
}
