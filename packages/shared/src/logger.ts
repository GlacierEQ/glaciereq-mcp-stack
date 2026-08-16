type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL: Level = (process.env.LOG_LEVEL as Level) ?? "info";

function shouldLog(level: Level): boolean {
  return LEVELS[level] >= LEVELS[MIN_LEVEL];
}

function fmt(level: Level, server: string, msg: string, meta?: unknown): string {
  const ts = new Date().toISOString();
  const metaStr = meta !== undefined ? " " + JSON.stringify(meta) : "";
  return `[${ts}] [${level.toUpperCase()}] [${server}] ${msg}${metaStr}`;
}

export function createLogger(serverName: string) {
  return {
    debug: (msg: string, meta?: unknown) => {
      if (shouldLog("debug")) process.stderr.write(fmt("debug", serverName, msg, meta) + "\n");
    },
    info: (msg: string, meta?: unknown) => {
      if (shouldLog("info")) process.stderr.write(fmt("info", serverName, msg, meta) + "\n");
    },
    warn: (msg: string, meta?: unknown) => {
      if (shouldLog("warn")) process.stderr.write(fmt("warn", serverName, msg, meta) + "\n");
    },
    error: (msg: string, meta?: unknown) => {
      if (shouldLog("error")) process.stderr.write(fmt("error", serverName, msg, meta) + "\n");
    },
  };
}
