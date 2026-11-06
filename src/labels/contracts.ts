import { getAddress, type Address } from "viem";

import type { ProtocolCategory } from "../types.js";

export type ContractLabel = {
  address: Address;
  protocol: string;
  category: ProtocolCategory;
};

/**
 * A small curated map, not a directory of every contract.
 * Addresses are checksummed at load so a typo fails fast.
 * Matching is exact: a call to a router counts, a lookalike does not.
 */
const RAW: ReadonlyArray<readonly [string, string, ProtocolCategory]> = [
  ["0x7a250d5630b4cf539739df2c5dacb4c659f2488d", "Uniswap", "dex"],
  ["0xe592427a0aece92de3edee1f18e0157c05861564", "Uniswap", "dex"],
  ["0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45", "Uniswap", "dex"],
  ["0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad", "Uniswap", "dex"],
  ["0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b", "Uniswap", "dex"],
  ["0x66a9893cc07d91d95644aedd05d03f95e1dba8af", "Uniswap", "dex"],
  ["0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f", "SushiSwap", "dex"],
  ["0x1111111254eeb25477b68fb85ed929f73a960582", "1inch", "dex"],
  ["0x111111125421ca6dc452d289314280a0f8842a65", "1inch", "dex"],
  ["0xdef1c0ded9bec7f1a1670819833240f027b25eff", "0x", "dex"],
  ["0xba12222222228d8ba445958a75a0704d566bf2c8", "Balancer", "dex"],
  ["0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7", "Curve", "dex"],

  ["0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9", "Aave", "lending"],
  ["0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2", "Aave", "lending"],
  ["0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5", "Compound", "lending"],
  ["0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b", "Compound", "lending"],
  ["0xc3d688b66703497daa19211eedff47f25384cdc3", "Compound", "lending"],
  ["0x5ef30b9986345249bc32d8928b7ee64de9435e39", "Maker", "lending"],
  ["0xc13e21b648a5ee794902342038ff3adab66be987", "Spark", "lending"],

  ["0xae7ab96520de3a18e5e111b5eaab095312d7fe84", "Lido", "staking"],
  ["0x889edc2edab5f40e902b864ad4d7ade8e412f9b1", "Lido", "staking"],

  ["0x00000000006c3852cbef3e08e8df289169ede581", "OpenSea", "nft"],
  ["0x00000000000000adc04c56bf30ac9d3c0aaf14dc", "OpenSea", "nft"],
  ["0x0000000000000068f116a894984e2db1123eb395", "OpenSea", "nft"],
  ["0x7f268357a8c2552623316e2562d90e642bb538e5", "OpenSea", "nft"],
  ["0x7be8076f4ea4a4ad08075c2508e481d6c946d12b", "OpenSea", "nft"],
  ["0x000000000000ad05ccc4f10045630fb830b95127", "Blur", "nft"],
  ["0x59728544b08ab483533076417fbbb2fd0b17ce3a", "LooksRare", "nft"],

  ["0x5c7bcd6e7de5423a257d81b442095a1a6ced35c5", "Across", "bridge"],
  ["0x99c9fc46f92e8a1c0dec1b1747d010903e884be1", "Optimism", "bridge"],
  ["0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f", "Arbitrum", "bridge"],
  ["0x3ee18b2214aff97000d974cf647e7c347e8fa585", "Wormhole", "bridge"],
  ["0xb8901acb165ed027e32754e0ffe830802919727f", "Hop", "bridge"],
  ["0xdf0770df86a8034b3efef0a1bb3c889b8332ff56", "Stargate", "bridge"],

  ["0x28c6c06298d514db089934071355e5743bf21d60", "Binance", "exchange"],
  ["0x21a31ee1afc51d94c2efccaa2092ad1028285549", "Binance", "exchange"],
  ["0xf977814e90da44bfa03b6295a0616a897441acec", "Binance", "exchange"],
  ["0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43", "Coinbase", "exchange"],
  ["0x2910543af39aba0cd09dbb2d50200b3e800a63d2", "Kraken", "exchange"],

  ["0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e", "ENS", "identity"],
  ["0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85", "ENS", "identity"],
  ["0x231b0ee14048e9dccd1d247744d114a4eb5e8e63", "ENS", "identity"],
  ["0x253553366da8546fc250f225fe3d25d0c782303b", "ENS", "identity"],
  ["0x283af0b28c62c092c9727f1ee09c02ca627eb7f5", "ENS", "identity"],
  ["0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401", "ENS", "identity"],

  ["0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", "WETH", "token"],
  ["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", "USDC", "token"],
  ["0xdac17f958d2ee523a2206206994597c13d831ec7", "USDT", "token"],
  ["0x6b175474e89094c44da98b954eedeac495271d0f", "DAI", "token"],

  ["0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc", "Tornado Cash", "mixer"],
  ["0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936", "Tornado Cash", "mixer"],
  ["0x910cbd523d972eb0a6f4cae4618ad62622b39dbf", "Tornado Cash", "mixer"],
  ["0xa160cdab225685da1d56aa342ad8841c3b53f291", "Tornado Cash", "mixer"],
  ["0xd90e2f925da726b50c4ed8d0fb90ad053324f31b", "Tornado Cash", "mixer"],
];

export const CONTRACT_LABELS: readonly ContractLabel[] = RAW.map(([address, protocol, category]) => ({
  address: getAddress(address),
  protocol,
  category,
}));

const BY_ADDRESS = new Map<string, ContractLabel>(
  CONTRACT_LABELS.map((label) => [label.address.toLowerCase(), label]),
);

export function lookupLabel(address: string): ContractLabel | undefined {
  return BY_ADDRESS.get(address.toLowerCase());
}
