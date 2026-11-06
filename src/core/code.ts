import { getAddress, type Address, type Hex } from "viem";

import type { Delegation } from "../types.js";

export type CodeInterpretation = {
  isContract: boolean;
  delegation: Delegation | null;
};

/**
 * EIP-7702 delegation designators are `0xef0100` plus a 20-byte address.
 * Those accounts are still EOAs that point at an implementation, not deployed contracts.
 */
export function interpretCode(code: Hex): CodeInterpretation {
  if (code === "0x" || code === "0x0") {
    return { isContract: false, delegation: null };
  }
  const lower = code.toLowerCase();
  if (lower.startsWith("0xef0100") && lower.length === 48) {
    const implementation = getAddress(`0x${lower.slice(8)}`) as Address;
    return {
      isContract: false,
      delegation: { standard: "eip-7702", implementation },
    };
  }
  return { isContract: true, delegation: null };
}
