/**
 * Structured, secret-safe logging helper.
 *
 * Never pass raw user objects, profile rows, API keys, or provider error bodies to these
 * functions — only primitive, non-sensitive fields (ids, status codes, durations, counts).
 */
type LogFields = Record<string, string | number | boolean | null | undefined>;

function write(level: "info" | "warn" | "error", event: string, fields?: LogFields) {
  const entry = {
    level,
    event,
    time: new Date().toISOString(),
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, fields?: LogFields) => write("info", event, fields),
  warn: (event: string, fields?: LogFields) => write("warn", event, fields),
  error: (event: string, fields?: LogFields) => write("error", event, fields),
};

/** Generates a short request/trace id for correlating logs without exposing internals. */
export function newRequestId(): string {
  return crypto.randomUUID();
}
