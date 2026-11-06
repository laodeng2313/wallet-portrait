export const DISCLAIMER =
  "Tags are public-data heuristics for exploration. They are not a risk score, not KYC/AML screening, and not financial, legal, or compliance advice.";

export const HIGH_BALANCE_WEI = 100n * 10n ** 18n;

export const DAY_SECONDS = 86_400;

/** Last sampled activity within this window → `active`. */
export const ACTIVE_WINDOW_DAYS = 90;

/** Last sampled activity older than this → `dormant`. */
export const DORMANT_AFTER_DAYS = 365;

/** First sampled activity within this window can qualify as `new-wallet`. */
export const NEW_WALLET_WINDOW_DAYS = 45;

export const NEW_WALLET_MAX_OUTGOING = 5;

/** Explorer-reported total above this disqualifies `new-wallet`. */
export const NEW_WALLET_MAX_APPROX_TX = 10;

/** Outgoing nonce at or above this, packed into BURST_WINDOW_DAYS, → high-risk heuristic. */
export const BURST_MIN_OUTGOING = 40;

export const BURST_WINDOW_DAYS = 7;

export const DEFAULT_SAMPLE_SIZE = 50;

export const USER_AGENT = "wallet-portrait/0.1";

export const DEFAULT_RPC_URLS = [
  "https://ethereum.publicnode.com",
  "https://cloudflare-eth.com",
  "https://eth.drpc.org",
  "https://rpc.mevblocker.io",
] as const;
