import { describe, expect, it } from "vitest";

import { parseArgs } from "../src/cli/args.js";

describe("parseArgs", () => {
  it("reads an address and flags", () => {
    const parsed = parseArgs(["--json", "--sample", "15", "--rpc", "https://rpc.example", "vitalik.eth"]);
    expect(parsed).toEqual({
      ok: true,
      options: {
        help: false,
        json: true,
        sample: 15,
        rpc: "https://rpc.example",
        address: "vitalik.eth",
      },
    });
  });

  it("rejects a missing sample, an unknown flag, and two addresses", () => {
    expect(parseArgs(["--sample"]).ok).toBe(false);
    expect(parseArgs(["--sample", "0"]).ok).toBe(false);
    expect(parseArgs(["--nope"]).ok).toBe(false);
    const two = parseArgs(["0xabc", "0xdef"]);
    expect(two.ok).toBe(false);
    if (!two.ok) expect(two.error).toMatch(/one address/);
  });
});
