/**
 * Global error handlers (D-08).
 *
 * Extracted to a separate module so they can be tested without
 * triggering ReactDOM.createRoot side effects from main.tsx.
 */

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
}

export function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  console.error("[UnhandledRejection]", {
    timestamp: new Date().toISOString(),
    type: "unhandledRejection",
    reason:
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason),
    stack: event.reason instanceof Error ? event.reason.stack : undefined,
  });
}
