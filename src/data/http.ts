import { USER_AGENT } from "../core/constants.js";
import type { FetchLike } from "../types.js";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function fetchJson(
  url: string,
  options: { timeoutMs?: number; fetchImpl?: FetchLike; label: string },
): Promise<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { accept: "application/json" };
    if (!("document" in globalThis)) headers["user-agent"] = USER_AGENT;
    const response = await fetchImpl(url, { headers, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${options.label} failed (${response.status})`);
    }
    try {
      return await response.json();
    } catch {
      throw new Error(`${options.label} returned a non-JSON body`);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${options.label} timed out`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "unknown error";
}
