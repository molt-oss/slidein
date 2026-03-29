/**
 * 構造化ログユーティリティ
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

export function structuredLog(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>,
): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  };
  console.log(JSON.stringify(entry));
}
