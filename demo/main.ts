import { analyzeAddress } from "../src/index.ts";
import type { Portrait, PortraitTag } from "../src/types.ts";

const form = document.querySelector<HTMLFormElement>("#form");
const input = document.querySelector<HTMLInputElement>("#address");
const status = document.querySelector<HTMLParagraphElement>("#status");
const result = document.querySelector<HTMLElement>("#result");
const submit = form?.querySelector<HTMLButtonElement>("button[type=submit]");

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = input?.value ?? "";
  void compose(value);
});

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-fill]")) {
  button.addEventListener("click", () => {
    if (!input) return;
    input.value = button.dataset.fill ?? "";
    input.focus();
  });
}

async function compose(value: string): Promise<void> {
  if (!status || !result || !submit) return;
  status.classList.remove("error");
  status.textContent = "Reading public chain data…";
  submit.disabled = true;
  result.hidden = true;
  result.replaceChildren();
  try {
    const portrait = await analyzeAddress(value);
    render(portrait);
    status.textContent = "Portrait ready. Tags are heuristics.";
    result.hidden = false;
  } catch (error) {
    status.classList.add("error");
    status.textContent = error instanceof Error ? error.message : "Could not build a portrait.";
  } finally {
    submit.disabled = false;
  }
}

function render(portrait: Portrait): void {
  if (!result) return;
  result.append(
    el("p", "summary", portrait.summary),
    el("p", "section-label", "Snapshot"),
    stats(portrait),
    el("p", "section-label", "Tags"),
    tagList(portrait.tags),
    el("p", "section-label", "Protocols in the sample"),
    protocolList(portrait),
    el("p", "section-label", "Notes"),
    el("p", "reason", portrait.notes.join(" ")),
    jsonBlock(portrait),
  );
}

function stats(portrait: Portrait): HTMLElement {
  const rows: Array<[string, string]> = [
    ["Address", portrait.address],
    ["ENS", portrait.ensName ?? "—"],
    ["Balance", `${trimEth(portrait.stats.balanceEth)} ETH`],
    ["Outgoing", portrait.stats.outgoingTxCount.toLocaleString("en-US")],
    ["Explorer txs", portrait.stats.approxTxCount?.toLocaleString("en-US") ?? "—"],
    ["First", portrait.stats.firstActivityAt?.slice(0, 10) ?? "—"],
    ["Last", portrait.stats.lastActivityAt?.slice(0, 10) ?? "—"],
    ["History", portrait.sources.history],
  ];
  const list = el("ul", "stats");
  for (const [label, value] of rows) {
    const item = document.createElement("li");
    item.append(el("span", "", label), el("strong", "", value));
    list.append(item);
  }
  return list;
}

function tagList(tags: PortraitTag[]): HTMLElement {
  const list = el("ul", "tags");
  if (tags.length === 0) {
    list.append(el("li", "", "No heuristic matched."));
    return list;
  }
  for (const tag of tags) {
    const item = el("li", tag.id === "high-risk-heuristics" ? "risk" : "", `${tag.label} · ${tag.id}`);
    item.title = tag.reason;
    list.append(item);
  }
  return list;
}

function protocolList(portrait: Portrait): HTMLElement {
  const list = el("ul", "protocols");
  if (portrait.protocols.length === 0) {
    list.append(el("li", "", "None recognized"));
    return list;
  }
  for (const protocol of portrait.protocols.slice(0, 12)) {
    list.append(el("li", "", `${protocol.protocol} · ${protocol.category} · ${protocol.hits}`));
  }
  return list;
}

function jsonBlock(portrait: Portrait): HTMLElement {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Portrait JSON";
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(portrait, null, 2);
  details.append(summary, pre);
  return details;
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function trimEth(value: string): string {
  const dot = value.indexOf(".");
  if (dot === -1) return value;
  const frac = value.slice(dot + 1, dot + 7).replace(/0+$/, "");
  return frac ? `${value.slice(0, dot)}.${frac}` : value.slice(0, dot);
}
