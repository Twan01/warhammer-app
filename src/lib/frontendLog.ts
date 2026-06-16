import { invoke } from "@tauri-apps/api/core";

/**
 * Best-effort, infallible frontend-to-disk log (REL-08, D-07).
 *
 * Calls the append_frontend_log Tauri command fire-and-forget.
 * Never throws into the caller — a failed invoke is silently swallowed
 * so that logging can never cascade into an error-handler loop.
 */
export function logFrontend(line: string): void {
  void invoke("append_frontend_log", { line }).catch(() => {});
}
