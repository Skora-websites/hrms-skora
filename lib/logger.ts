type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

const isProduction = process.env.NODE_ENV === "production";

function createLogEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };
}

function formatLog(entry: LogEntry): string {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
  const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
  return `${prefix} ${entry.message}${contextStr}`;
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (isProduction) return;
    const entry = createLogEntry("debug", message, context);
    console.debug(formatLog(entry));
  },

  info(message: string, context?: Record<string, unknown>) {
    const entry = createLogEntry("info", message, context);
    if (isProduction) {
      // In production, only log structured info
      console.log(JSON.stringify(entry));
    } else {
      console.info(formatLog(entry));
    }
  },

  warn(message: string, context?: Record<string, unknown>) {
    const entry = createLogEntry("warn", message, context);
    if (isProduction) {
      console.warn(JSON.stringify(entry));
    } else {
      console.warn(formatLog(entry));
    }
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    const entry = createLogEntry("error", message, {
      ...context,
      ...(error instanceof Error
        ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
        : { error }),
    });
    if (isProduction) {
      console.error(JSON.stringify(entry));
    } else {
      console.error(formatLog(entry));
    }
  },
};
