/**
 * Logger utility for consistent logging across the app
 * In production, this can be configured to send to external logging service
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const isDevelopment = __DEV__;

class Logger {
  private logToConsole(level: LogLevel, message: string, ...args: any[]) {
    if (!isDevelopment && level === "debug") {
      // Skip debug logs in production
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case "debug":
        if (isDevelopment) {
          console.log(prefix, message, ...args);
        }
        break;
      case "info":
        console.info(prefix, message, ...args);
        break;
      case "warn":
        console.warn(prefix, message, ...args);
        break;
      case "error":
        console.error(prefix, message, ...args);
        // In production, could also send to error reporting service
        break;
    }
  }

  debug(message: string, ...args: any[]) {
    this.logToConsole("debug", message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.logToConsole("info", message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.logToConsole("warn", message, ...args);
  }

  error(message: string, error?: Error | unknown, ...args: any[]) {
    if (error instanceof Error) {
      this.logToConsole("error", message, {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }, ...args);
    } else {
      this.logToConsole("error", message, error, ...args);
    }
  }

  // For tracking analytics events (can be extended to send to analytics service)
  track(event: string, properties?: Record<string, any>) {
    if (isDevelopment) {
      this.debug(`Analytics Event: ${event}`, properties);
    }
    // In production, send to analytics service
  }
}

export const logger = new Logger();
export default logger;