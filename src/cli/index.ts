#!/usr/bin/env node
import { pathToFileURL } from "node:url";

import { analyzeAddress } from "../core/analyze.js";
import { PortraitError } from "../core/errors.js";
import { HELP, parseArgs } from "./args.js";
import { formatPortrait } from "./format.js";

export async function run(argv: readonly string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    console.error(parsed.error);
    console.error("Run wallet-portrait --help for usage.");
    return 1;
  }
  if (parsed.options.help) {
    console.log(HELP);
    return 0;
  }
  if (!parsed.options.address) {
    console.error("Pass an Ethereum address or ENS name.");
    console.error("Run wallet-portrait --help for usage.");
    return 1;
  }

  try {
    const rpcUrl = parsed.options.rpc ?? process.env.RPC_URL;
    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    const portrait = await analyzeAddress(parsed.options.address, {
      ...(rpcUrl ? { rpcUrl } : {}),
      ...(etherscanApiKey ? { etherscanApiKey } : {}),
      ...(parsed.options.sample !== undefined ? { sampleSize: parsed.options.sample } : {}),
    });
    if (parsed.options.json) {
      console.log(JSON.stringify(portrait, null, 2));
    } else {
      console.log(formatPortrait(portrait));
    }
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return error instanceof PortraitError ? error.exitCode : 1;
  }
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  run(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
