import { getAddress } from "viem";
import { describe, expect, it } from "vitest";

import { looksLikeEnsName, validateAddress } from "../src/core/address.js";

const VITALIK = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

describe("validateAddress", () => {
  it("accepts lowercase and returns the EIP-55 form", () => {
    const result = validateAddress(VITALIK.toLowerCase());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.address).toBe(getAddress(VITALIK));
  });

  it("accepts a valid checksum and all-uppercase hex", () => {
    expect(validateAddress(`  ${VITALIK}  `)).toEqual({ ok: true, address: VITALIK });
    const upper = validateAddress(VITALIK.toUpperCase());
    expect(upper.ok).toBe(true);
    if (upper.ok) expect(upper.address).toBe(VITALIK);
  });

  it("rejects a mixed-case checksum mismatch", () => {
    const flipped = `${VITALIK.slice(0, 4)}${VITALIK[4] === "A" ? "a" : "A"}${VITALIK.slice(5)}`;
    const result = validateAddress(flipped);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/checksum/i);
  });

  it("rejects empty input, short hex, and ENS names", () => {
    expect(validateAddress("   ").ok).toBe(false);
    const short = validateAddress("0x1234");
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.error).toMatch(/40 hex/);
    const ens = validateAddress("vitalik.eth");
    expect(ens.ok).toBe(false);
    if (!ens.ok) expect(ens.error).toMatch(/ENS/);
  });
});

describe("looksLikeEnsName", () => {
  it("recognizes dotted names and ignores hex", () => {
    expect(looksLikeEnsName("vitalik.eth")).toBe(true);
    expect(looksLikeEnsName("Foo.Bar.eth")).toBe(true);
    expect(looksLikeEnsName(VITALIK)).toBe(false);
    expect(looksLikeEnsName("not a name")).toBe(false);
    expect(looksLikeEnsName("localhost")).toBe(false);
  });
});
