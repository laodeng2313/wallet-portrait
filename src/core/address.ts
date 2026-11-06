import { getAddress, isAddress, type Address } from "viem";

export type AddressValidation =
  | { ok: true; address: Address }
  | { ok: false; error: string };

const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/**
 * Accept a 20-byte hex address.
 * All-lowercase and all-uppercase skip the checksum.
 * Mixed case must be valid EIP-55.
 * ENS names are rejected here; `analyzeAddress` resolves them separately.
 */
export function validateAddress(input: string): AddressValidation {
  let value = input.trim();
  if (value.startsWith("0X")) value = `0x${value.slice(2)}`;
  if (!value) {
    return { ok: false, error: "Enter an Ethereum address or ENS name." };
  }
  if (looksLikeEnsName(value)) {
    return {
      ok: false,
      error: "This looks like an ENS name. Pass it to analyzeAddress or the CLI, which will try to resolve it.",
    };
  }
  if (!HEX_ADDRESS.test(value)) {
    return { ok: false, error: "Address must be 0x followed by 40 hex characters." };
  }
  if (!isAddress(value, { strict: false })) {
    return { ok: false, error: "Address must be 0x followed by 40 hex characters." };
  }
  const checksummed = getAddress(value);
  const body = value.slice(2);
  const mixedCase = body !== body.toLowerCase() && body !== body.toUpperCase();
  if (mixedCase && value !== checksummed) {
    return {
      ok: false,
      error: "Checksum does not match this address. Use the EIP-55 mixed-case form, or all lowercase.",
    };
  }
  return { ok: true, address: checksummed };
}

/** `vitalik.eth` and dotted names. Hex strings are never treated as ENS. */
export function looksLikeEnsName(input: string): boolean {
  const value = input.trim();
  if (value.startsWith("0x") || value.startsWith("0X")) return false;
  return /^(?:[a-z0-9-]{1,63}\.)+[a-z]{2,}$/i.test(value);
}

export function toAddress(value: unknown): Address | null {
  if (typeof value !== "string" || !isAddress(value, { strict: false })) return null;
  try {
    const address = getAddress(value);
    if (address === "0x0000000000000000000000000000000000000000") return null;
    return address;
  } catch {
    return null;
  }
}
