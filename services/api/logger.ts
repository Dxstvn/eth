// API Logger for comprehensive debugging

import { ApiLogEntry } from './types';

export class ApiLogger {
  private static instance: ApiLogger;
  private logs: ApiLogEntry[] = [];
  private maxLogs = 100;
  private debug = false;

  private constructor() {
    this.debug = process.env.NODE_ENV === 'development';
  }

  static getInstance(): ApiLogger {
    if (!ApiLogger.instance) {
      ApiLogger.instance = new ApiLogger();
    }
    return ApiLogger.instance;
  }

  setDebug(enabled: boolean): void {
    this.debug = enabled;
  }

  log(entry: Partial<ApiLogEntry>): void {
    const logEntry: ApiLogEntry = {
      timestamp: new Date().toISOString(),
      method: entry.method || 'UNKNOWN',
      endpoint: entry.endpoint || 'UNKNOWN',
      ...entry
    };

    // Add to internal log buffer
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output if debug is enabled
    if (this.debug) {
      const { method, endpoint, status, duration, error } = logEntry;
      const statusColor = status && status >= 400 ? '\x1b[31m' : '\x1b[32m'; // Red for errors, green for success
      const resetColor = '\x1b[0m';

      if (error) {
        // Only log network errors once to avoid spam in development
        const isNetworkError = error.message?.includes('Network error') || error.message?.includes('Failed to fetch');
        if (!isNetworkError || process.env.NEXT_PUBLIC_API_VERBOSE === 'true') {
          console.error(
            `[API] ${method} ${endpoint} - ${statusColor}ERROR${resetColor}`,
            error
          );
        }
      } else {
        console.log(
          `[API] ${method} ${endpoint} - ${statusColor}${status}${resetColor} (${duration}ms)`
        );
      }

      // Log request/response bodies in verbose mode
      if (process.env.NEXT_PUBLIC_API_VERBOSE === 'true') {
        if (logEntry.requestBody) {
          console.log('[API] Request:', logEntry.requestBody);
        }
        if (logEntry.responseBody) {
          console.log('[API] Response:', logEntry.responseBody);
        }
      }
    }
  }

  getLogs(): ApiLogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Helper method to measure API call duration
  startTimer(): () => number {
    const start = performance.now();
    return () => Math.round(performance.now() - start);
  }

  // Log failed requests for debugging
  logError(method: string, endpoint: string, error: any, duration?: number): void {
    this.log({
      method,
      endpoint,
      error: {
        message: error.message || 'Unknown error',
        code: error.code,
        statusCode: error.statusCode,
        details: error.details
      },
      duration,
      status: error.statusCode || 0
    });
  }

  // Log successful requests
  logSuccess(
    method: string,
    endpoint: string,
    status: number,
    duration: number,
    responseBody?: any
  ): void {
    this.log({
      method,
      endpoint,
      status,
      duration,
      responseBody: process.env.NEXT_PUBLIC_API_VERBOSE === 'true' ? responseBody : undefined
    });
  }
}

export const apiLogger = ApiLogger.getInstance();