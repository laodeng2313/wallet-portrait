import { formatEthDisplay, formatIsoDate, shortAddress } from "../core/format.js";
import type { Portrait } from "../types.js";

const PROTOCOL_LIMIT = 12;

export function formatPortrait(portrait: Portrait): string {
  const lines: string[] = [];
  lines.push("Wallet portrait · Ethereum mainnet");
  lines.push("");
  lines.push(field("Address", portrait.address));
  lines.push(field("ENS", portrait.ensName ?? "—"));
  lines.push(field("Balance", `${formatEthDisplay(BigInt(portrait.stats.balanceWei))} ETH`));
  lines.push(field("Outgoing txs", `${portrait.stats.outgoingTxCount.toLocaleString("en-US")} (account nonce)`));
  lines.push(
    field(
      "Explorer txs",
      portrait.stats.approxTxCount === null
        ? "—"
        : `${portrait.stats.approxTxCount.toLocaleString("en-US")} (approx, includes incoming)`,
    ),
  );
  lines.push(field("First activity", formatIsoDate(portrait.stats.firstActivityAt)));
  lines.push(field("Last activity", formatIsoDate(portrait.stats.lastActivityAt)));
  lines.push(field("Account", accountKind(portrait)));
  lines.push(
    field(
      "Sample",
      `${portrait.stats.sampledTxCount} txs, ${portrait.stats.sampledTokenTransferCount} token transfers`,
    ),
  );
  lines.push(field("History", portrait.sources.history));
  lines.push(field("RPC", portrait.sources.rpcUrl ?? "—"));
  if (portrait.identity) {
    lines.push(field("Local label", `${portrait.identity.protocol} (${portrait.identity.category})`));
  }

  lines.push("");
  lines.push("Protocols");
  if (portrait.protocols.length === 0) {
    lines.push("  None of the sampled counterparties are in the local label map.");
  } else {
    const shown = portrait.protocols.slice(0, PROTOCOL_LIMIT);
    for (const protocol of shown) {
      const hits = `${protocol.hits} hit${protocol.hits === 1 ? "" : "s"}`;
      lines.push(`  ${protocol.protocol.padEnd(16)} ${protocol.category.padEnd(10)} ${hits}`);
    }
    const rest = portrait.protocols.length - shown.length;
    if (rest > 0) lines.push(`  … and ${rest} more`);
  }

  lines.push("");
  lines.push("Tags");
  if (portrait.tags.length === 0) {
    lines.push("  None of the current heuristics matched.");
  } else {
    for (const tag of portrait.tags) {
      lines.push(`  ${tag.id}`);
      lines.push(`    ${tag.reason}`);
    }
  }

  lines.push("");
  lines.push("Summary");
  lines.push(wrap(portrait.summary, 88).map((line) => `  ${line}`).join("\n"));

  lines.push("");
  lines.push("Notes");
  for (const note of portrait.notes) {
    lines.push(`  ${note}`);
  }

  lines.push("");
  lines.push("Disclaimer");
  lines.push(wrap(portrait.disclaimer, 88).map((line) => `  ${line}`).join("\n"));
  lines.push("");
  return lines.join("\n");
}

function accountKind(portrait: Portrait): string {
  if (portrait.stats.delegation) {
    return `delegated EOA (EIP-7702 → ${shortAddress(portrait.stats.delegation.implementation)})`;
  }
  return portrait.stats.isContract ? "contract" : "EOA";
}

function field(label: string, value: string): string {
  return `${label.padEnd(16)} ${value}`;
}

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!word) continue;
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}
