import * as vscode from "vscode";

export interface LogFilters {
  console: {
    info: boolean;
    warn: boolean;
    error: boolean;
    debug: boolean;
    log: boolean;
  };
  network: {
    enabled: boolean;
    errorsOnly: boolean;
  };
}

export class LogFilterManager {
  private static instance: LogFilterManager;
  private context: vscode.ExtensionContext | undefined;

  private constructor() {}

  public static getInstance(): LogFilterManager {
    if (!LogFilterManager.instance) {
      LogFilterManager.instance = new LogFilterManager();
    }
    return LogFilterManager.instance;
  }

  public initialize(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  public getFilters(): LogFilters {
    if (!this.context) {
      return this.getDefaultFilters();
    }

    const filters = this.context.globalState.get<LogFilters>("logFilters");
    return filters || this.getDefaultFilters();
  }

  public async updateFilters(filters: LogFilters): Promise<void> {
    if (!this.context) {
      return;
    }

    await this.context.globalState.update("logFilters", filters);
  }

  public getDefaultFilters(): LogFilters {
    return {
      console: {
        info: true,
        warn: true,
        error: true,
        debug: true,
        log: true,
      },
      network: {
        enabled: true,
        errorsOnly: false,
      },
    };
  }

  public shouldLogConsoleMessage(type: string): boolean {
    const filters = this.getFilters();
    const normalizedType = type.toLowerCase();

    switch (normalizedType) {
      case "info":
        return filters.console.info;
      case "warning":
      case "warn":
        return filters.console.warn;
      case "error":
        return filters.console.error;
      case "debug":
        return filters.console.debug;
      case "log":
      default:
        return filters.console.log;
    }
  }

  public shouldLogNetworkRequest(status: number): boolean {
    const filters = this.getFilters();

    if (!filters.network.enabled) {
      return false;
    }

    if (filters.network.errorsOnly) {
      return status >= 400;
    }

    return true;
  }
}
