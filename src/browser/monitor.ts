import * as vscode from "vscode";
import * as puppeteer from "puppeteer-core";
import { EventEmitter } from "events";
import { MonitoredPage, BrowserLog, NetworkRequest } from "../shared/types";
import { ToastService } from "../shared/utils/toast";
import { ErrorHandler, BrowserError } from "../shared/utils/error-handler";

import { BrowserLogHandler } from "./utils/log-handler";
import { PageManager } from "./services/page-manager";
import { BrowserStatusBar } from "./services/status-bar";
import { HealthChecker } from "./services/health-checker";
import { BrowserEventHandlers } from "./events/event-handlers";

export class BrowserMonitor extends EventEmitter {
  private static instance: BrowserMonitor;
  private pageManager: PageManager;
  private healthChecker: HealthChecker;
  private toastService: ToastService;
  private errorHandler: ErrorHandler;
  private isConnected: boolean = false;
  private disconnectEmitter = new vscode.EventEmitter<void>();

  // Modularized components
  private logHandler: BrowserLogHandler;
  private statusBar: BrowserStatusBar;
  private eventHandlers: BrowserEventHandlers;

  private constructor() {
    super();
    this.pageManager = PageManager.getInstance();
    this.healthChecker = HealthChecker.getInstance();
    this.toastService = ToastService.getInstance();
    this.errorHandler = ErrorHandler.getInstance();

    // Initialize all components
    this.logHandler = new BrowserLogHandler();
    this.statusBar = new BrowserStatusBar();
    this.eventHandlers = new BrowserEventHandlers(this.logHandler);

    // Set up health checker disconnect handler
    this.healthChecker.onDisconnect(() => {
      this.disconnectEmitter.fire();
    });
  }

  public static getInstance(): BrowserMonitor {
    if (!BrowserMonitor.instance) {
      BrowserMonitor.instance = new BrowserMonitor();
    }
    return BrowserMonitor.instance;
  }

  public async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.disconnect();
      }

      await this.pageManager.connect();
      const pages = await this.pageManager.getPages();

      if (!pages?.length) {
        throw new BrowserError(
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

      const client = await this.pageManager.setActivePage(
        selection.page,
        selection.info
      );
      this.eventHandlers.setupEventListeners(client);
      this.isConnected = true;
      this.statusBar.setConnected(true);
      await this.showSuccessNotification();
      this.startHealthCheck();
    } catch (error) {
      this.errorHandler.handleBrowserError(
        error,
        "Failed to connect to browser"
      );
      this.isConnected = false;
      this.statusBar.setConnected(false);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.pageManager.disconnect();
      this.isConnected = false;
      this.statusBar.setConnected(false);
      this.stopHealthCheck();
      this.disconnectEmitter.fire();
    } catch (error) {
      this.errorHandler.handleBrowserError(
        error,
        "Failed to disconnect from browser"
      );
      throw error;
    }
  }

  public onDisconnect(listener: () => void): vscode.Disposable {
    return this.disconnectEmitter.event(listener);
  }

  public isPageConnected(): boolean {
    return this.isConnected && this.pageManager.getActivePage() !== null;
  }

  public getLogs(): { console: BrowserLog[]; network: NetworkRequest[] } {
    if (!this.isPageConnected()) {
      throw new BrowserError("No browser tab connected");
    }
    return this.logHandler.getLogs();
  }

  public clearLogs(): void {
    if (!this.isPageConnected()) {
      throw new BrowserError("No browser tab connected");
    }
    this.logHandler.clearLogs();
    this.toastService.showLogsClearedSuccess();
  }

  private startHealthCheck(): void {
    this.healthChecker.startChecking(async () => {
      try {
        const isHealthy = await this.pageManager.checkPageAccessible();
        if (!isHealthy) {
          await this.handleSessionError();
        }
      } catch (error) {
        this.errorHandler.handleBrowserError(error, "Health check failed");
        await this.handleSessionError();
      }
    });
  }

  private stopHealthCheck(): void {
    this.healthChecker.clearHealthCheck();
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

  public getActivePage(): MonitoredPage | null {
    return this.pageManager.getActivePage();
  }

  public dispose() {
    this.disconnect();
    this.statusBar.dispose();
    this.healthChecker.dispose();
    this.disconnectEmitter.dispose();
  }

  public async getPageForScreenshot(): Promise<puppeteer.Page | null> {
    if (!this.isConnected) {
      return null;
    }
    return this.pageManager.getActivePageForScreenshot();
  }
}
