/** Categories in the local label map. Not an industry taxonomy. */
export type ProtocolCategory =
  | "dex"
  | "lending"
  | "staking"
  | "nft"
  | "bridge"
  | "exchange"
  | "mixer"
  | "token"
  | "identity";

export type TagId =
  | "active"
  | "dormant"
  | "new-wallet"
  | "empty"
  | "contract"
  | "delegated-eoa"
  | "defi-user"
  | "nft-touched"
  | "exchange-touched"
  | "bridge-touched"
  | "high-balance"
  | "high-risk-heuristics";

export type PortraitTag = {
  id: TagId;
  label: string;
  /** Why this tag was applied. Heuristic, not a judgment. */
  reason: string;
};

export type ProtocolTouch = {
  protocol: string;
  category: ProtocolCategory;
  /** Checksummed contracts from the local map that matched the sample. */
  addresses: string[];
  /** Sampled events that touched this protocol. A sample, not lifetime volume. */
  hits: number;
};

export type Delegation = {
  standard: "eip-7702";
  implementation: string;
};

export type HistorySource = "blockscout" | "etherscan" | "none";

export type PortraitStats = {
  /** Native balance in wei, decimal string. */
  balanceWei: string;
  /** Native balance in ETH, full precision decimal string. */
  balanceEth: string;
  /** Account nonce: successful outgoing transactions. Not an in+out total. */
  outgoingTxCount: number;
  /** Explorer-reported transaction count when the API provides one. */
  approxTxCount: number | null;
  /** ISO-8601, from the earliest sampled transaction. */
  firstActivityAt: string | null;
  /** ISO-8601, from the latest sampled transaction or token transfer. */
  lastActivityAt: string | null;
  isContract: boolean;
  delegation: Delegation | null;
  sampledTxCount: number;
  sampledTokenTransferCount: number;
};

export type Portrait = {
  address: string;
  ensName: string | null;
  chain: "ethereum";
  chainId: 1;
  /** Set when the address itself is in the local label map. */
  identity: { protocol: string; category: ProtocolCategory } | null;
  stats: PortraitStats;
  protocols: ProtocolTouch[];
  tags: PortraitTag[];
  summary: string;
  notes: string[];
  sources: {
    /** RPC URL with userinfo and common key params redacted. */
    rpcUrl: string | null;
    history: HistorySource;
    historyNote: string | null;
  };
  generatedAt: string;
  disclaimer: string;
};

export type TokenStandard = "ERC-20" | "ERC-721" | "ERC-1155";

/** One normalized transaction or token transfer. All network code funnels through this. */
export type ObservedEvent = {
  kind: "tx" | "token";
  hash: string | null;
  timestamp: number | null;
  from: `0x${string}` | null;
  to: `0x${string}` | null;
  token: `0x${string}` | null;
  tokenStandard: TokenStandard | null;
};

export type HistorySample = {
  source: HistorySource;
  note: string | null;
  approxTxCount: number | null;
  ensName: string | null;
  events: ObservedEvent[];
  /**
   * True when the sample includes the explorer's earliest transaction.
   * A recent page alone must not be treated as a wallet's first activity.
   */
  anchoredFirstActivity: boolean;
};

export type AccountSnapshot = {
  balanceWei: bigint;
  outgoingTxCount: number;
  code: `0x${string}`;
  ensName: string | null;
  rpcUrl: string;
};

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type AnalyzeClients = {
  readAccount: (address: `0x${string}`) => Promise<AccountSnapshot>;
  readHistory: (address: `0x${string}`) => Promise<HistorySample>;
  resolveName?: (name: string) => Promise<`0x${string}`>;
};

export type AnalyzeOptions = {
  /** Preferred JSON-RPC URL. Falls back to public endpoints when it fails. */
  rpcUrl?: string;
  /** Optional Etherscan API key. Blockscout is used when this is absent. */
  etherscanApiKey?: string;
  /** Recent transactions to request. Clamped to 1–50. Default 50. */
  sampleSize?: number;
  /** Clock for tags and `generatedAt`. Tests inject this. */
  now?: Date;
  fetchImpl?: FetchLike;
  /** Skip the network entirely. */
  clients?: AnalyzeClients;
};
