"use client";

// Developer Logging System
export interface LogEntry {
  timestamp: number;
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  args?: any[];
  sessionId: string;
}

class DeveloperLogger {
  private logs: LogEntry[] = [];
  private currentSessionId: string;
  private previousSessionLogs: LogEntry[] = [];
  private maxLogs = 10000; // Maximum logs to keep in memory

  constructor() {
    this.currentSessionId = this.generateSessionId();
    this.loadPreviousSessionLogs();
    this.setupConsoleInterception();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadPreviousSessionLogs(): void {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("dev_logs_previous_session");
        if (stored) {
          this.previousSessionLogs = JSON.parse(stored);
        }
      }
    } catch (error) {
      console.error("Failed to load previous session logs:", error);
    }
  }

  private savePreviousSessionLogs(): void {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("dev_logs_previous_session", JSON.stringify(this.previousSessionLogs));
      }
    } catch (error) {
      console.error("Failed to save previous session logs:", error);
    }
  }

  private setupConsoleInterception(): void {
    if (typeof window === "undefined") return;

    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug,
    };

    const logMethod = (level: LogEntry['level']) => {
      return (...args: any[]) => {
        // Call original method
        originalConsole[level](...args);

        // Capture log entry
        const logEntry: LogEntry = {
          timestamp: Date.now(),
          level,
          message: args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '),
          args: args.length > 1 ? args.slice(1) : undefined,
          sessionId: this.currentSessionId,
        };

        this.addLog(logEntry);
      };
    };

    // Override console methods
    console.log = logMethod('log');
    console.warn = logMethod('warn');
    console.error = logMethod('error');
    console.info = logMethod('info');
    console.debug = logMethod('debug');

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.addLog({
        timestamp: Date.now(),
        level: 'error',
        message: `Unhandled Error: ${event.error?.message || event.message}`,
        args: [event.error?.stack || event.filename],
        sessionId: this.currentSessionId,
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.addLog({
        timestamp: Date.now(),
        level: 'error',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        args: [event.reason],
        sessionId: this.currentSessionId,
      });
    });
  }

  private addLog(logEntry: LogEntry): void {
    this.logs.push(logEntry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Auto-save logs periodically
    if (this.logs.length % 100 === 0) {
      this.saveCurrentSessionLogs();
    }
  }

  private saveCurrentSessionLogs(): void {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("dev_logs_current_session", JSON.stringify(this.logs));
      }
    } catch (error) {
      console.error("Failed to save current session logs:", error);
    }
  }

  public getCurrentSessionLogs(): LogEntry[] {
    return [...this.logs];
  }

  public getPreviousSessionLogs(): LogEntry[] {
    return [...this.previousSessionLogs];
  }

  public getAllLogs(): { current: LogEntry[]; previous: LogEntry[] } {
    return {
      current: this.getCurrentSessionLogs(),
      previous: this.getPreviousSessionLogs(),
    };
  }

  public clearCurrentSession(): void {
    this.logs = [];
    this.saveCurrentSessionLogs();
  }

  public clearPreviousSession(): void {
    this.previousSessionLogs = [];
    this.savePreviousSessionLogs();
  }

  public clearAllLogs(): void {
    this.clearCurrentSession();
    this.clearPreviousSession();
  }

  public exportLogsToText(): string {
    const { current, previous } = this.getAllLogs();
    
    let output = `# Developer Logs Export\n`;
    output += `Generated: ${new Date().toISOString()}\n`;
    output += `Current Session ID: ${this.currentSessionId}\n\n`;

    // Previous Session
    if (previous.length > 0) {
      output += `## Previous Session (${previous.length} entries)\n`;
      output += `Session ID: ${previous[0]?.sessionId || 'Unknown'}\n\n`;
      
      previous.forEach(log => {
        output += `[${new Date(log.timestamp).toISOString()}] ${log.level.toUpperCase()}: ${log.message}\n`;
        if (log.args && log.args.length > 0) {
          output += `  Args: ${log.args.map(arg => JSON.stringify(arg)).join(', ')}\n`;
        }
      });
      output += `\n`;
    }

    // Current Session
    if (current.length > 0) {
      output += `## Current Session (${current.length} entries)\n`;
      output += `Session ID: ${this.currentSessionId}\n\n`;
      
      current.forEach(log => {
        output += `[${new Date(log.timestamp).toISOString()}] ${log.level.toUpperCase()}: ${log.message}\n`;
        if (log.args && log.args.length > 0) {
          output += `  Args: ${log.args.map(arg => JSON.stringify(arg)).join(', ')}\n`;
        }
      });
    } else {
      output += `## Current Session (0 entries)\n`;
      output += `Session ID: ${this.currentSessionId}\n\n`;
      output += `No logs captured yet.\n`;
    }

    return output;
  }

  public downloadLogsAsFile(): void {
    try {
      const logsText = this.exportLogsToText();
      const blob = new Blob([logsText], { type: 'text/plain;charset=utf-8' });
      
      // Create a temporary URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Create a temporary anchor element
      const a = document.createElement('a');
      a.href = url;
      a.download = `dev-logs-${new Date().toISOString().split('T')[0]}-${Date.now()}.txt`;
      a.style.display = 'none';
      
      // Add to DOM, click, and remove
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up the URL
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      console.log("✅ Logs exported successfully");
    } catch (error) {
      console.error("❌ Failed to export logs:", error);
      throw error;
    }
  }

  public onSessionEnd(): void {
    // Move current session to previous session
    this.previousSessionLogs = [...this.logs];
    this.logs = [];
    this.savePreviousSessionLogs();
    this.saveCurrentSessionLogs();
  }
}

// Create global instance
let developerLogger: DeveloperLogger | null = null;

export function getDeveloperLogger(): DeveloperLogger {
  if (!developerLogger) {
    developerLogger = new DeveloperLogger();
  }
  return developerLogger;
}

// Initialize logger when module loads
if (typeof window !== "undefined") {
  getDeveloperLogger();
}
