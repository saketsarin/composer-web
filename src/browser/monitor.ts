import * as vscode from "vscode";
import * as puppeteer from "puppeteer-core";
import { EventEmitter } from "events";
import {
  BrowserLog,
  MonitoredPage,
  NetworkRequest,
  LogData,
} from "../shared/types";
import { ConfigManager } from "../shared/config";
import { ToastService } from "../shared/utils/toast";
import { LogFilterManager } from "../shared/config/log-filters";

export class BrowserMonitor extends EventEmitter {
  private static instance: BrowserMonitor;
  private browser: puppeteer.Browser | null = null;
  private activePage: {
    page: puppeteer.Page;
    client: puppeteer.CDPSession;
    info: MonitoredPage;
  } | null = null;
  private consoleLogs: BrowserLog[] = [];
  private networkLogs: NetworkRequest[] = [];
  private statusBarItem: vscode.StatusBarItem;
  private isConnected: boolean = false;
  private configManager: ConfigManager;
  private logFilterManager: LogFilterManager;
  private disconnectEmitter = new vscode.EventEmitter<void>();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private toastService: ToastService;

  private constructor() {
    super();
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "web-preview.smartCapture";
    this.configManager = ConfigManager.getInstance();
    this.logFilterManager = LogFilterManager.getInstance();
    this.toastService = ToastService.getInstance();
    this.updateStatusBar();
  }

  public static getInstance(): BrowserMonitor {
    if (!BrowserMonitor.instance) {
      BrowserMonitor.instance = new BrowserMonitor();
    }
    return BrowserMonitor.instance;
  }

  private updateStatusBar() {
    if (!this.isConnected) {
      this.statusBarItem.text = "$(plug) Connect Browser Tab";
    } else {
      this.statusBarItem.text = `$(eye) Capture Tab Info (${this.activePage?.info.title})`;
    }
    this.statusBarItem.tooltip = this.isConnected
      ? `Connected to: ${this.activePage?.info.url}`
      : "Click to connect to a browser tab";
    this.statusBarItem.show();
  }

  public async connect(): Promise<void> {
    const debugUrl = this.configManager.get<string>("remoteDebuggingUrl");

    try {
      const puppeteer = await import("puppeteer-core");
      this.browser = await puppeteer.connect({
        browserURL: debugUrl,
        defaultViewport: null,
      });

      const pages = await this.browser.pages();
      if (!pages?.length) {
        throw new Error(
          "No open pages found. Please open at least one tab in Chrome."
        );
      }

      const picks = await Promise.all(
        pages.map(async (page) => {
          let title = "";
          let url = "";
          try {
            title = await page.title();
            url = await page.url();
          } catch {
            // Ignore errors and use empty strings
          }
          return {
            label: title || url || "Untitled Page",
            description: url,
            page,
            info: { title, url, id: url },
          };
        })
      );

      const selection = await vscode.window.showQuickPick(picks, {
        placeHolder: "Select the webpage to monitor",
        matchOnDescription: true,
      });

      if (!selection) {
        return;
      }

      await this.monitorPage(selection.page, selection.info);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.toastService.showError(`Failed to connect: ${errorMessage}`);
      this.disconnect();
    }
  }

  private async monitorPage(page: puppeteer.Page, pageInfo: MonitoredPage) {
    if (this.activePage) {
      await this.stopMonitoring();
    }

    const client = await page.createCDPSession();

    try {
      await Promise.all([
        client.send("Page.enable"),
        client.send("Network.enable"),
        client.send("Runtime.enable"),
        client.send("Log.enable"),
      ]);
    } catch (error) {
      this.toastService.showError("Failed to initialize browser session");
      await this.disconnect();
      return;
    }

    this.activePage = { page, client, info: pageInfo };
    this.isConnected = true;

    // Set up console log capture
    await page.evaluate(() => {
      const originalConsole = {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        info: console.info.bind(console),
        debug: console.debug.bind(console),
      };

      type ConsoleMethod = keyof typeof originalConsole;

      (Object.keys(originalConsole) as ConsoleMethod[]).forEach((method) => {
        console[method] = function (...args: unknown[]) {
          originalConsole[method](...args);
        };
      });
    });

    this.setupEventListeners(client);
    this.updateStatusBar();

    await this.showSuccessNotification();
  }

  private setupEventListeners(client: puppeteer.CDPSession) {
    this.healthCheckInterval = setInterval(async () => {
      try {
        // Check if page is still accessible
        if (this.activePage?.page) {
          await Promise.all([
            client.send("Runtime.evaluate", { expression: "1" }),
            this.activePage.page.evaluate(() => true),
          ]);
        } else {
          throw new Error("Page not accessible");
        }
      } catch (error) {
        this.clearHealthCheck();
        await this.handleSessionError();
      }
    }, 5000);

    if (this.activePage?.page) {
      this.activePage.page.on("close", () => this.handlePageClosed());
      this.activePage.page.on("crash", () => this.handlePageClosed());
      this.activePage.page.on("detach", () => this.handlePageClosed());
      this.activePage.page.on("targetdestroyed", () => this.handlePageClosed());
    }

    client.on("Runtime.consoleAPICalled", (e) => {
      const formattedArgs: string[] = [];

      let trace = "";
      if (e.stackTrace) {
        trace = e.stackTrace.callFrames
          .map(
            (frame) =>
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
                (p) =>
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
              arg.preview?.properties?.find((p) => p.name === "stack")?.value ||
              "";
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
        formattedArgs.push(`\n${trace}`);
      }

      // Only add the log if it passes the filter
      if (this.logFilterManager.shouldLogConsoleMessage(e.type)) {
        const log: BrowserLog = {
          type: e.type,
          args: formattedArgs,
          timestamp: Date.now(),
          message: formattedArgs.join(" "),
        };
        this.consoleLogs.push(log);
        this.emit("console", log);
      }
    });

    client.on("Log.entryAdded", (e) => {
      // Only add the log if it passes the filter
      if (this.logFilterManager.shouldLogConsoleMessage(e.entry.level)) {
        const log: BrowserLog = {
          type: e.entry.level,
          args: [e.entry.text],
          timestamp: Date.now(),
          message: e.entry.text,
        };
        this.consoleLogs.push(log);
        this.emit("console", log);
      }
    });

    client.on("Network.responseReceived", (e) => {
      // Only add the network request if it passes the filter
      if (this.logFilterManager.shouldLogNetworkRequest(e.response.status)) {
        const request: NetworkRequest = {
          url: e.response.url,
          status: e.response.status,
          timestamp: Date.now(),
          method: e.type || "GET",
        };
        this.networkLogs.push(request);
        this.emit("network", request);
      }
    });

    client.on("Network.loadingFailed", (e) => {
      // Failed requests are always logged if network logging is enabled
      if (this.logFilterManager.shouldLogNetworkRequest(0)) {
        const request: NetworkRequest = {
          url: "Failed request",
          status: 0,
          error: e.errorText,
          timestamp: Date.now(),
          method: e.type || "UNKNOWN",
        };
        this.networkLogs.push(request);
        this.emit("network", request);
      }
    });
  }

  private async showSuccessNotification() {
    await this.toastService.showProgress(
      "Successfully connected to tab",
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    );
  }

  private async handleSessionError() {
    if (this.isConnected) {
      this.toastService.showSessionDisconnected();
      await this.disconnect();
    }
  }

  private async handlePageClosed() {
    if (this.isConnected) {
      this.toastService.showTabClosed();
      await this.disconnect();
    }
  }

  public clearLogs(): void {
    this.consoleLogs = [];
    this.networkLogs = [];
  }

  public onDisconnect(listener: () => void): vscode.Disposable {
    return this.disconnectEmitter.event(listener);
  }

  public async disconnect() {
    this.clearHealthCheck();
    await this.stopMonitoring();
    if (this.browser) {
      await this.browser.disconnect().catch(() => {});
      this.browser = null;
    }
    this.isConnected = false;
    this.updateStatusBar();
    this.disconnectEmitter.fire();
  }

  private async stopMonitoring() {
    if (this.activePage) {
      try {
        await this.activePage.client.detach();
      } catch {}
      this.activePage = null;
    }
  }

  public getActivePage(): MonitoredPage | null {
    return this.activePage?.info || null;
  }

  public getLogs(): LogData {
    return {
      console: this.consoleLogs,
      network: this.networkLogs,
    };
  }

  public isPageConnected(): boolean {
    return this.isConnected;
  }

  public dispose() {
    this.disconnect();
    this.statusBarItem.dispose();
  }

  public async getPageForScreenshot(): Promise<puppeteer.Page | null> {
    if (!this.activePage?.page) {
      return null;
    }

    try {
      // Verify the page is still responsive
      await this.activePage.page.evaluate(() => true);
      return this.activePage.page;
    } catch (error) {
      await this.handleSessionError();
      return null;
    }
  }

  private clearHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}
