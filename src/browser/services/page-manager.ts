import * as puppeteer from "puppeteer-core";
import { MonitoredPage } from "../../shared/types";

export class PageManager {
  private static instance: PageManager;
  private browser: puppeteer.Browser | null = null;
  private activePage: {
    page: puppeteer.Page;
    client: puppeteer.CDPSession;
    info: MonitoredPage;
  } | null = null;

  private constructor() {}

  public static getInstance(): PageManager {
    if (!PageManager.instance) {
      PageManager.instance = new PageManager();
    }
    return PageManager.instance;
  }

  public async connect(): Promise<void> {
    const browserURL = "http://localhost:9222";
    await this.connectToBrowser(browserURL);
  }

  private async connectToBrowser(
    browserURL: string
  ): Promise<puppeteer.Browser> {
    const puppeteer = await import("puppeteer-core");
    this.browser = await puppeteer.connect({
      browserURL,
      defaultViewport: null,
    });
    return this.browser;
  }

  public async getPages(): Promise<
    Array<{
      label: string;
      description: string;
      page: puppeteer.Page;
      info: MonitoredPage;
    }>
  > {
    if (!this.browser) {
      throw new Error("Browser not connected");
    }

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

    return picks;
  }

  public async setActivePage(
    page: puppeteer.Page,
    pageInfo: MonitoredPage
  ): Promise<puppeteer.CDPSession> {
    const client = await page.createCDPSession();

    try {
      await Promise.all([
        client.send("Page.enable"),
        client.send("Network.enable"),
        client.send("Runtime.enable"),
        client.send("Log.enable"),
      ]);
    } catch (error) {
      throw new Error("Failed to initialize browser session");
    }

    this.activePage = { page, client, info: pageInfo };

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

    return client;
  }

  public getActivePage(): MonitoredPage | null {
    return this.activePage?.info || null;
  }

  public getActivePageForScreenshot(): puppeteer.Page | null {
    return this.activePage?.page || null;
  }

  public async checkPageAccessible(): Promise<boolean> {
    if (!this.activePage?.page || !this.activePage?.client) {
      return false;
    }

    try {
      await Promise.all([
        this.activePage.client.send("Runtime.evaluate", { expression: "1" }),
        this.activePage.page.evaluate(() => true),
      ]);
      return true;
    } catch (error) {
      return false;
    }
  }

  public setupPageEventListeners(
    page: puppeteer.Page,
    onClose: () => void
  ): void {
    page.on("close", onClose);
    page.on("crash", onClose);
    page.on("detach", onClose);
    page.on("targetdestroyed", onClose);
  }

  public async stopMonitoring(): Promise<void> {
    if (this.activePage?.client) {
      try {
        await this.activePage.client.detach();
      } catch (error) {
        // Ignore detach errors
      }
    }
    this.activePage = null;
  }

  public async disconnect(): Promise<void> {
    await this.stopMonitoring();
    if (this.browser) {
      try {
        await this.browser.disconnect();
      } catch (error) {
        // Ignore disconnect errors
      }
    }
    this.browser = null;
  }
}
