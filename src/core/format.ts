import { formatEther } from "viem";

/** `0xd8dA6B…6045` style. The ellipsis is a single character. */
export function shortAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Up to 6 decimal places, trailing zeros removed. */
export function formatEthDisplay(wei: bigint): string {
  const eth = formatEther(wei);
  const dot = eth.indexOf(".");
  if (dot === -1) return eth;
  const whole = eth.slice(0, dot);
  const frac = eth
    .slice(dot + 1)
    .slice(0, 6)
    .replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

export function formatIsoDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export function joinList(items: readonly string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** Drop userinfo and common API-key query params before the URL is stored or printed. */
export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.username = "";
    parsed.password = "";
    for (const key of ["apikey", "api_key", "apiKey", "key", "token"]) {
      if (parsed.searchParams.has(key)) parsed.searchParams.set(key, "redacted");
    }
    return parsed.toString();
  } catch {
    return "custom-rpc";
  }
}
