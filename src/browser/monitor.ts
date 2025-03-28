import * as vscode from "vscode";
import * as puppeteer from "puppeteer-core";
import { EventEmitter } from "events";
import { MonitoredPage, LogData } from "../shared/types";
import { ConfigManager } from "../shared/config";
import { ToastService } from "../shared/utils/toast";

import { BrowserLogHandler } from "./utils/log-handler";
import { PageManager } from "./services/page-manager";
import { BrowserStatusBar } from "./services/status-bar";
import { HealthChecker } from "./services/health-checker";
import { BrowserEventHandlers } from "./events/event-handlers";

export class BrowserMonitor extends EventEmitter {
  private static instance: BrowserMonitor;
  private isConnected: boolean = false;
  private configManager: ConfigManager;
  private toastService: ToastService;

  // Modularized components
  private pageManager: PageManager;
  private logHandler: BrowserLogHandler;
  private statusBar: BrowserStatusBar;
  private healthChecker: HealthChecker;
  private eventHandlers: BrowserEventHandlers;

  private constructor() {
    super();
    this.configManager = ConfigManager.getInstance();
    this.toastService = ToastService.getInstance();

    // Initialize all components
    this.pageManager = new PageManager();
    this.logHandler = new BrowserLogHandler();
    this.statusBar = new BrowserStatusBar();
    this.healthChecker = new HealthChecker();
    this.eventHandlers = new BrowserEventHandlers(this.logHandler);

    // Set up disconnect handler
    this.healthChecker.onDisconnect(() => this.handleSessionError());
  }

  public static getInstance(): BrowserMonitor {
    if (!BrowserMonitor.instance) {
      BrowserMonitor.instance = new BrowserMonitor();
    }
    return BrowserMonitor.instance;
  }

  public async connect(): Promise<void> {
    const debugUrl = this.configManager.get<string>("remoteDebuggingUrl");

    try {
      // Connect to browser
      await this.pageManager.connectToBrowser(debugUrl);

      // Get available pages
      const pages = await this.pageManager.getPages();

      if (!pages?.length) {
        throw new Error(
          "No open pages found. Please open at least one tab in Chrome."
        );
      }

      // Let user select page
      const selection = await vscode.window.showQuickPick(pages, {
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
    if (this.isConnected) {
      await this.stopMonitoring();
    }

    try {
      // Setup active page
      const client = await this.pageManager.setActivePage(page, pageInfo);

      // Set up event listeners
      this.eventHandlers.setupEventListeners(client);

      // Set up page event listeners
      this.pageManager.setupPageEventListeners(page, () =>
        this.handlePageClosed()
      );

      // Start health checks
      this.healthChecker.startHealthCheck(() =>
        this.pageManager.checkPageAccessible()
      );

      // Update status
      this.isConnected = true;
      this.statusBar.setConnected(true);
      this.statusBar.setActivePage(pageInfo);

      await this.showSuccessNotification();
    } catch (error) {
      this.toastService.showError("Failed to initialize browser session");
      await this.disconnect();
    }
  }

  private async showSuccessNotification() {
    const activePage = this.pageManager.getActivePage();
    if (activePage) {
      this.toastService.showInfo(
        `Successfully connected to: ${activePage.title}`
      );
    }
  }

  private async handleSessionError() {
    this.toastService.showError(
      "Browser connection lost. The tab may have been closed or navigated away."
    );
    await this.disconnect();
  }

  private async handlePageClosed() {
    await this.disconnect();
  }

  public clearLogs(): void {
    this.logHandler.clearLogs();
  }

  public onDisconnect(listener: () => void): vscode.Disposable {
    return this.healthChecker.onDisconnect(listener);
  }

  public async disconnect() {
    this.healthChecker.clearHealthCheck();
    await this.pageManager.disconnect();
    this.isConnected = false;
    this.statusBar.setConnected(false);
    this.statusBar.setActivePage(null);
  }

  private async stopMonitoring() {
    this.healthChecker.clearHealthCheck();
    await this.pageManager.stopMonitoring();
    this.isConnected = false;
    this.statusBar.setConnected(false);
  }

  public getActivePage(): MonitoredPage | null {
    return this.pageManager.getActivePage();
  }

  public getLogs(): LogData {
    return this.logHandler.getLogs();
  }

  public isPageConnected(): boolean {
    return this.isConnected;
  }

  public dispose() {
    this.disconnect();
    this.statusBar.dispose();
    this.healthChecker.dispose();
  }

  public async getPageForScreenshot(): Promise<puppeteer.Page | null> {
    if (!this.isConnected) {
      return null;
    }
    return this.pageManager.getActivePageForScreenshot();
  }
}
