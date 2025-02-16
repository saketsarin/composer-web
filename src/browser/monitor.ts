import * as vscode from "vscode";
import * as puppeteer from "puppeteer-core";
import { EventEmitter } from "events";
import { BrowserLog, MonitoredPage, NetworkRequest, LogData } from "../types";
import { ConfigManager } from "../config";

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
  private disconnectEmitter = new vscode.EventEmitter<void>();

  private constructor() {
    super();
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "web-preview.smartCapture";
    this.configManager = ConfigManager.getInstance();
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
      vscode.window.showErrorMessage(`Failed to connect: ${errorMessage}`);
      this.disconnect();
    }
  }

  private async monitorPage(page: puppeteer.Page, pageInfo: MonitoredPage) {
    if (this.activePage) {
      await this.stopMonitoring();
    }

    const client = await page.createCDPSession();
    await Promise.all([
      client.send("Page.enable"),
      client.send("Network.enable"),
      client.send("Runtime.enable"),
      client.send("Log.enable"),
    ]);

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
    client.on("Runtime.consoleAPICalled", (e) => {
      const log: BrowserLog = {
        type: e.type,
        text: e.args.map((arg) => arg.value || arg.description || "").join(" "),
        timestamp: Date.now(),
      };
      this.consoleLogs.push(log);
      this.emit("console", log);
    });

    client.on("Log.entryAdded", (e) => {
      const log: BrowserLog = {
        type: e.entry.level,
        text: e.entry.text,
        timestamp: Date.now(),
      };
      this.consoleLogs.push(log);
      this.emit("console", log);
    });

    client.on("Network.responseReceived", (e) => {
      const request: NetworkRequest = {
        url: e.response.url,
        status: e.response.status,
        timestamp: Date.now(),
      };
      this.networkLogs.push(request);
      this.emit("network", request);
    });

    client.on("Network.loadingFailed", (e) => {
      const request: NetworkRequest = {
        url: "Failed request",
        status: 0,
        error: e.errorText,
        timestamp: Date.now(),
      };
      this.networkLogs.push(request);
      this.emit("network", request);
    });

    // Listen for page close/crash events
    this.activePage?.page.on("close", () => this.handlePageClosed());
    this.activePage?.page.on("crash", () => this.handlePageClosed());
  }

  private async showSuccessNotification() {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Successfully connected to tab",
        cancellable: false,
      },
      async (progress) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        progress.report({ increment: 100 });
      }
    );
  }

  private async handlePageClosed() {
    vscode.window.showWarningMessage(
      "The monitored tab was closed. Monitoring has stopped."
    );
    await this.disconnect();
  }

  public clearLogs(): void {
    this.consoleLogs = [];
    this.networkLogs = [];
  }

  public onDisconnect(listener: () => void): vscode.Disposable {
    return this.disconnectEmitter.event(listener);
  }

  public async disconnect() {
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
    return this.activePage?.page || null;
  }
}
