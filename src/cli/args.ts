export type CliOptions = {
  help: boolean;
  json: boolean;
  rpc?: string;
  sample?: number;
  address?: string;
};

export function parseArgs(argv: readonly string[]): { ok: true; options: CliOptions } | { ok: false; error: string } {
  const options: CliOptions = { help: false, json: false };
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined) continue;
    if (token === "--help" || token === "-h") {
      options.help = true;
      continue;
    }
    if (token === "--json") {
      options.json = true;
      continue;
    }
    if (token === "--text") {
      options.json = false;
      continue;
    }
    if (token === "--rpc") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) return { ok: false, error: "--rpc needs a URL." };
      options.rpc = value;
      index += 1;
      continue;
    }
    if (token === "--sample") {
      const value = argv[index + 1];
      if (!value || !/^\d+$/.test(value)) return { ok: false, error: "--sample needs an integer from 1 to 50." };
      const sample = Number(value);
      if (sample < 1 || sample > 50) return { ok: false, error: "--sample needs an integer from 1 to 50." };
      options.sample = sample;
      index += 1;
      continue;
    }
    if (token.startsWith("-")) {
      return { ok: false, error: `Unknown option ${token}.` };
    }
    positionals.push(token);
  }

  if (positionals.length > 1) {
    return { ok: false, error: "Pass one address or ENS name." };
  }
  const address = positionals[0];
  if (address) options.address = address;
  return { ok: true, options };
}

export const HELP = `wallet-portrait — a readable sketch of an Ethereum address

Usage
  wallet-portrait <address | name.eth> [--json] [--rpc <url>] [--sample <n>]
  npm run cli -- <address>

Options
  --json           Print the portrait as JSON (default is plain text)
  --text           Print the plain-text portrait
  --rpc <url>      Ethereum JSON-RPC URL (overrides RPC_URL)
  --sample <n>     Recent transactions to sample, 1–50 (default 50)
  -h, --help       Show this help

Environment
  RPC_URL               Optional RPC. Public endpoints are tried when unset or down.
  ETHERSCAN_API_KEY     Optional. Without it, history comes from Blockscout.

Tags are heuristics, not a risk score and not KYC/AML or financial advice.
`;
