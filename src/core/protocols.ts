import type { Address } from "viem";

import { lookupLabel } from "../labels/contracts.js";
import type { ObservedEvent, ProtocolCategory, ProtocolTouch } from "../types.js";

const ZERO = "0x0000000000000000000000000000000000000000";

export function collectProtocols(subject: Address, events: readonly ObservedEvent[]): ProtocolTouch[] {
  const grouped = new Map<
    string,
    { category: ProtocolCategory; addresses: Set<string>; hits: number }
  >();

  for (const event of events) {
    const seenInEvent = new Set<string>();
    for (const candidate of [event.from, event.to, event.token]) {
      if (!candidate || candidate === ZERO) continue;
      if (candidate.toLowerCase() === subject.toLowerCase()) continue;
      const label = lookupLabel(candidate);
      if (!label || seenInEvent.has(label.protocol)) continue;
      seenInEvent.add(label.protocol);
      const row = grouped.get(label.protocol) ?? {
        category: label.category,
        addresses: new Set<string>(),
        hits: 0,
      };
      row.hits += 1;
      row.addresses.add(label.address);
      grouped.set(label.protocol, row);
    }
  }

  return [...grouped.entries()]
    .map(([protocol, row]) => ({
      protocol,
      category: row.category,
      addresses: [...row.addresses].sort(),
      hits: row.hits,
    }))
    .sort((a, b) => b.hits - a.hits || a.protocol.localeCompare(b.protocol));
}

export function sawNftTransfer(events: readonly ObservedEvent[]): boolean {
  return events.some((event) => event.tokenStandard === "ERC-721" || event.tokenStandard === "ERC-1155");
}
