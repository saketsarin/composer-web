import { BrowserLog, NetworkRequest, LogData } from "../../shared/types";
import { LogFilterManager } from "../../shared/config/log-filters";

export interface ExtendedNetworkRequest extends NetworkRequest {
  id: string;
  headers?: Record<string, string>;
  startTime: string;
  type?: string;
}

export class BrowserLogHandler {
  private consoleLogs: BrowserLog[] = [];
  private networkLogs: ExtendedNetworkRequest[] = [];
  private logFilterManager: LogFilterManager;

  constructor() {
    this.logFilterManager = LogFilterManager.getInstance();
  }

  public clearLogs(): void {
    this.consoleLogs = [];
    this.networkLogs = [];
  }

  public getLogs(): LogData {
    return {
      console: this.applyLogFilters(this.consoleLogs),
      network: this.networkLogs,
    };
  }

  private applyLogFilters(logs: BrowserLog[]): BrowserLog[] {
    const filters = this.shouldShowFilteredLogs() ? [] : this.getFilters();
    if (!filters.length) {
      return logs;
    }

    return logs.filter((log) => {
      const messageString =
        typeof log.message === "string" ? log.message : log.args.join(" ");

      return !filters.some((filter) => {
        const regex = new RegExp(filter, "i");
        return regex.test(messageString);
      });
    });
  }

  private shouldShowFilteredLogs(): boolean {
    return this.logFilterManager.getFilters().console.log;
  }

  private getFilters(): string[] {
    // Since getActiveFilters is not available, we'll use an empty array
    // You may need to implement this method or modify the LogFilterManager
    return [];
  }

  public handleConsoleMessage(e: any): void {
    const formattedArgs: string[] = [];

    let trace = "";
    if (e.stackTrace) {
      trace = e.stackTrace.callFrames
        .map(
          (frame: any) =>
            `    at ${frame.functionName || "(anonymous)"} (${frame.url}:${
              frame.lineNumber + 1
            }:${frame.columnNumber + 1})`
        )
        .join("\n");
    }

    for (const arg of e.args) {
      if (arg.type === "object" && arg.preview) {
        if (Array.isArray(arg.preview.properties)) {
          const props = arg.preview.properties
            .map(
              (p: any) =>
                `${p.name}: ${
                  typeof p.value === "string"
                    ? `"${p.value}"`
                    : p.value || "undefined"
                }`
            )
            .join(", ");
          formattedArgs.push(`Object {${props}}`);
        } else {
          formattedArgs.push(arg.preview.description || "Object {}");
        }
      } else if (arg.type === "function") {
        formattedArgs.push(arg.description || "function");
      } else if (arg.type === "undefined") {
        formattedArgs.push("undefined");
      } else if (arg.type === "string") {
        formattedArgs.push(arg.value);
      } else if (arg.type === "number" || arg.type === "boolean") {
        formattedArgs.push(String(arg.value));
      } else if (arg.type === "symbol") {
        formattedArgs.push(arg.description || "Symbol()");
      } else if ("subtype" in arg && arg.subtype === "error") {
        if (arg.description && arg.description.includes("\n")) {
          formattedArgs.push(arg.description);
        } else {
          const stack =
            arg.preview?.properties?.find((p: any) => p.name === "stack")
              ?.value || "";
          formattedArgs.push(
            `${arg.description || "Error"}${stack ? `\n${stack}` : ""}`
          );
        }
      } else {
        formattedArgs.push(String(arg));
      }
    }

    if (trace) {
      formattedArgs[0] = `Trace: ${formattedArgs[0] || "console.trace"}`;
    }

    const timestamp = Date.now();
    const message = formattedArgs.join(" ");

    this.consoleLogs.push({
      type: e.type,
      args: formattedArgs,
      timestamp,
      message,
    });
  }

  public handleNetworkRequest(request: any): void {
    this.networkLogs.push({
      id: request.requestId,
      url: request.request.url,
      method: request.request.method,
      status: 0,
      timestamp: Date.now(),
      startTime: new Date().toISOString(),
      duration: 0,
      type: request.type || "",
      headers: request.request.headers,
    });
  }

  public updateNetworkResponse(response: any): void {
    const request = this.networkLogs.find(
      (req) => req.id === response.requestId
    );
    if (request) {
      request.status = response.response.status;
      request.headers = {
        ...request.headers,
        ...response.response.headers,
      };
      if (response.response.timing) {
        const now = new Date();
        const startTime = new Date(request.startTime);
        request.duration = now.getTime() - startTime.getTime();
      }
    }
  }
}
