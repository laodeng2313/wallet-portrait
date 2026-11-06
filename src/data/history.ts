import type { Address } from "viem";

import { readBlockscout } from "./blockscout.js";
import { readEtherscan } from "./etherscan.js";
import { errorMessage } from "./http.js";
import type { FetchLike, HistorySample } from "../types.js";

/**
 * Prefer Etherscan when the caller set a key. Otherwise use Blockscout, which
 * does not need a key. A failed explorer never throws: the portrait still builds.
 */
export async function readHistory(
  address: Address,
  options: { etherscanApiKey?: string; sampleSize: number; fetchImpl?: FetchLike },
): Promise<HistorySample> {
  const key = options.etherscanApiKey?.trim();
  if (key) {
    try {
      return await readEtherscan(address, key, options.sampleSize, options.fetchImpl);
    } catch (error) {
      try {
        const fallback = await readBlockscout(address, options.sampleSize, options.fetchImpl);
        return {
          ...fallback,
          note: `Etherscan failed (${errorMessage(error)}). Used Blockscout instead. ${fallback.note ?? ""}`.trim(),
        };
      } catch (fallbackError) {
        return emptyHistory(
          `Etherscan failed (${errorMessage(error)}) and Blockscout was unreachable (${errorMessage(fallbackError)}).`,
        );
      }
    }
  }

  try {
    return await readBlockscout(address, options.sampleSize, options.fetchImpl);
  } catch (error) {
    return emptyHistory(
      `Blockscout was unreachable (${errorMessage(error)}). Set ETHERSCAN_API_KEY to try Etherscan, or keep going with RPC-only stats.`,
    );
  }
}

function emptyHistory(note: string): HistorySample {
  return {
    source: "none",
    note,
    approxTxCount: null,
    ensName: null,
    events: [],
    anchoredFirstActivity: false,
  };
}
