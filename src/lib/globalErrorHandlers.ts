/**
 * Global error handlers (D-08).
 *
 * Extracted to a separate module so they can be tested without
 * triggering ReactDOM.createRoot side effects from main.tsx.
 */
import { logFrontend } from "@/lib/frontendLog";

export function handleGlobalError(
  message: string | Event,
  source?: string,
  lineno?: number,
  colno?: number,
  error?: Error
): void {
  console.error("[GlobalError]", {
    timestamp: new Date().toISOString(),
    type: "uncaught",
    message: String(message),
    source,
    location: `${lineno ?? 0}:${colno ?? 0}`,
    stack: error?.stack,
  });
  // D-08: also write to frontend.log on disk (best-effort, swallows errors).
  logFrontend(
    `[uncaught] ${String(message)} @ ${source ?? "?"}:${lineno ?? 0}:${colno ?? 0}${error?.stack ? "\n" + error.stack : ""}`
  );
}

export function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  const reason =
    event.reason instanceof Error
      ? event.reason.message
      : String(event.reason);
  const stack =
    event.reason instanceof Error ? event.reason.stack : undefined;
  console.error("[UnhandledRejection]", {
    timestamp: new Date().toISOString(),
    type: "unhandledRejection",
    reason,
    stack,
  });
  // D-08: also write to frontend.log on disk (best-effort, swallows errors).
  logFrontend(
    `[unhandledRejection] ${reason}${stack ? "\n" + stack : ""}`
  );
}
