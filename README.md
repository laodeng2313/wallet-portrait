# wallet-portrait

[![License: MIT](https://img.shields.io/badge/license-MIT-1c2822)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-1c2822)](./package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-1c2822)](./tsconfig.json)

A small TypeScript library and CLI that turns an Ethereum address into a readable portrait: native balance, nonce, a sample of activity, contracts it recognizes, and a handful of heuristic tags.

It is a reading aid for public chain data. **Tags are heuristics. They are not a risk score, not KYC/AML screening, and not financial, legal, or compliance advice.**

## Try it

You need Node.js 20 or newer. No API key is required.

```bash
git clone https://github.com/laodeng2313/wallet-portrait.git
cd wallet-portrait
npm install
npm test
npm run cli -- 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

That address is [vitalik.eth](https://etherscan.io/address/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045). `vitalik.eth` itself also works when the RPC can resolve ENS:

```bash
npm run cli -- vitalik.eth
npm run cli -- --json 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

After `npm run build`, the same command is `node dist/cli/index.js <address>`.

Local demo page:

```bash
npm run demo
```

Open http://127.0.0.1:5173 , paste an address, and press Compose. The page calls the public RPC and Blockscout from your browser.

## What you get

`analyzeAddress` returns one JSON-safe `Portrait`:

| Field | Meaning |
| --- | --- |
| `address`, `ensName` | Checksummed address, and a name when ENS resolution or Blockscout has one |
| `chain`, `chainId` | `ethereum` and `1` |
| `stats` | ETH balance, outgoing nonce, explorer tx count when available, first/last sampled activity, contract vs EIP-7702 delegation |
| `protocols` | Counterparties that hit the local label map, with a hit count inside the sample |
| `tags` | Heuristic ids, a short label, and the reason each one fired |
| `summary` | A few plain sentences |
| `sources` | Which RPC and explorer were used |
| `disclaimer` | The heuristic warning, repeated inside the JSON |

Outgoing transactions are the account nonce (successful sends). The explorer count, when present, includes incoming transfers and is approximate. Dates come from a **recent sample plus the earliest transaction** the explorer returns, not from a full archive. A quiet month can show few labeled protocols even for a famous address.

## Example

Captured 6 Nov 2026 with the default sample of 50. Balances and counts move.

```text
Wallet portrait · Ethereum mainnet

Address          0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
ENS              vitalik.eth
Balance          5.780441 ETH
Outgoing txs     5,970 (account nonce)
Explorer txs     78,427 (approx, includes incoming)
First activity   2015-09-28
Last activity    2026-11-06
Account          delegated EOA (EIP-7702 → 0x5A7F…6f6d)
Sample           51 txs, 50 token transfers
History          blockscout
RPC              https://ethereum.publicnode.com/

Protocols
  ENS              identity   2 hits
  USDC             token      1 hit
  USDT             token      1 hit

Tags
  delegated-eoa
    Bytecode is an EIP-7702 delegation to 0x5A7FC11397E9a8AD41BF10bf13F22B0a63f96f6d. The account is still an EOA.
  active
    Last sampled activity is within 90 days.
  nft-touched
    The sample includes an ERC-721 or ERC-1155 transfer.

Summary
  0xd8dA…6045 (vitalik.eth) is a delegated account (EIP-7702) on Ethereum mainnet holding
  about 5.780441 ETH, with 5,970 outgoing transactions. Sampled activity runs from
  2015-09-28 to 2026-11-06, and an explorer reports about 78,427 transactions in total.
  Labeled protocols in the sample include ENS. Labeled tokens include USDC and USDT.
  Heuristic tags: delegated-eoa, active, nft-touched.
```

The same object is what `--json` prints. The extra transaction in “51 txs” is the earliest one, added beside the recent page so the portrait can show a first-seen date.

## CLI

```text
wallet-portrait <address | name.eth> [--json] [--rpc <url>] [--sample <n>]
```

| Flag | Effect |
| --- | --- |
| `--json` | Print the portrait as JSON. Default is the text layout above. |
| `--text` | Force the text layout. |
| `--rpc <url>` | Use this JSON-RPC endpoint first. Overrides `RPC_URL`. |
| `--sample <n>` | How many recent transactions to request, from 1 to 50. Default 50. |
| `-h`, `--help` | Usage. |

Exit `0` on a portrait, `1` on a bad address or usage, `2` when every RPC fails. If explorers fail but an RPC responds, the command still exits `0` and the portrait says history was unavailable.

Addresses must be `0x` plus 40 hex characters. All-lowercase and all-uppercase are accepted. Mixed case must be valid [EIP-55](https://eips.ethereum.org/EIPS/eip-55).

## Library

```ts
import { analyzeAddress } from "wallet-portrait";

const portrait = await analyzeAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
console.log(portrait.summary);
console.log(portrait.tags.map((tag) => tag.id));
```

From this repo, before publishing:

```bash
npx tsx -e 'import { analyzeAddress } from "./src/index.ts";
const portrait = await analyzeAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
console.log(portrait.summary);'
```

`buildPortrait` is the pure function behind the network calls. Tests use it, and `analyzeAddress(..., { clients })`, so the shaping logic does not need a live chain.

## Environment

Copy `.env.example` if you want the names in front of you. The process reads the variables below; nothing in the tool loads a `.env` file for you.

| Variable | Required | Role |
| --- | --- | --- |
| `RPC_URL` | No | Ethereum JSON-RPC URL tried first. When it is unset or down, the client walks a short list of public endpoints (`ethereum.publicnode.com`, `cloudflare-eth.com`, `eth.drpc.org`, `rpc.mevblocker.io`). |
| `ETHERSCAN_API_KEY` | No | When set, recent history is read from the Etherscan v2 API (`chainid=1`). If that call fails, Blockscout is the fallback. |

Userinfo and common key query parameters are stripped before an RPC URL is stored on the portrait or printed. Do not commit keys. `.env` is gitignored.

## Data sources

1. **JSON-RPC** (viem): balance, nonce, bytecode, and ENS name → address or address → name when the node supports it.
2. **Blockscout** public API for Ethereum, with no key: one page of recent transactions, one page of token transfers, the tx counter, the address profile (including `ens_domain_name`), and the earliest transaction.
3. **Etherscan v2**, only if `ETHERSCAN_API_KEY` is set.

EIP-7702 delegation designators (`0xef0100` plus an address) are reported as delegated accounts, not as deployed contracts.

If both explorers fail, you still get balance, nonce, bytecode, and an explicit note that history was missing. Protocol tags stay empty in that case, because they need counterparties.

The label map in `src/labels/contracts.ts` is a short curated list (Uniswap, Aave, Compound, Lido, OpenSea, a few bridges and exchanges, WETH and major stablecoins, ENS, Tornado Cash pools, and others). Unknown contracts are omitted. It is not a directory and it will go stale.

## Heuristic tags

Every tag has a `reason` string on the portrait. Thresholds live in `src/core/constants.ts`.

| Tag | Rule of thumb |
| --- | --- |
| `active` | Last sampled activity is within 90 days. |
| `dormant` | Last sampled activity is more than 365 days old. |
| `new-wallet` | The explorer returned an earliest transaction within 45 days, outgoing nonce is at most 5, and the reported total is not already large. Not applied when the earliest transaction is missing. |
| `empty` | Zero ETH, nonce 0, no sampled transfers, and not a contract. |
| `contract` | Bytecode is present and it is not an EIP-7702 delegation. |
| `delegated-eoa` | Bytecode is an EIP-7702 delegation designator. |
| `defi-user` | The sample touches a labeled DEX, lending, or staking contract. |
| `nft-touched` | The sample touches a labeled NFT market, or includes an ERC-721 / ERC-1155 transfer. |
| `exchange-touched` | The sample touches a labeled exchange address. |
| `bridge-touched` | The sample touches a labeled bridge. |
| `high-balance` | Native balance is at least 100 ETH. A display threshold, not a judgment. |
| `high-risk-heuristics` | The sample (or the address itself) hits the local mixer list, **or** the nonce is at least 40 and the anchored first and last activity fall within 7 days. |

`high-risk-heuristics` is a crude pattern name for those two rules. It is not a score, a sanction screening, or a statement about a person.

Holding or transferring USDC does not by itself produce `defi-user`. Stablecoins and WETH show up under protocols with category `token`.

## Layout

```text
src/core        address checks, portrait shaping, tags, summary
src/data        RPC, Blockscout, optional Etherscan
src/labels      curated contract map
src/cli         argument parsing and text layout
demo            one Vite page over the same library
tests           validation, tags, portrait shape, mocked explorers
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm test` | Vitest. No network. |
| `npm run lint` | `tsc --noEmit` for `src` and `tests`. |
| `npm run cli -- <address>` | Run the CLI with tsx. |
| `npm start -- <address>` | Same as `cli`. |
| `npm run build` | Emit `dist/` and type declarations. |
| `npm run demo` | Vite dev server for the page. |

## Privacy

A query sends the address to your RPC provider and to Blockscout, or to Etherscan when a key is set. There is no other telemetry in this repository.

## 简体中文

`wallet-portrait` 是一个开源的以太坊地址画像工具。克隆后跑 CLI（或本地演示页），就能看到余额、nonce、抽样活跃区间、认得出的协议，以及一组启发式标签。

这些标签只是公开数据上的粗规则，方便人读。它们不是风险评分，不是 KYC/AML，也不是投资或合规建议。

```bash
npm install
npm test
npm run cli -- 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

不配置付费 key 也能用。默认走公共 RPC 和 Blockscout。可选环境变量：`RPC_URL`、`ETHERSCAN_API_KEY`。演示页：`npm run demo`，打开 http://127.0.0.1:5173 。

## License

[MIT](./LICENSE)
