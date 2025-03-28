import * as vscode from "vscode";
import { MonitoredPage } from "../../shared/types";

export class BrowserStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private isConnected: boolean = false;
  private activePage: MonitoredPage | null = null;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "web-preview.smartCapture";
    this.update();
  }

  public setConnected(connected: boolean): void {
    this.isConnected = connected;
    this.update();
  }

  public setActivePage(page: MonitoredPage | null): void {
    this.activePage = page;
    this.update();
  }

  public update(): void {
    if (!this.isConnected) {
      this.statusBarItem.text = "$(plug) Connect Browser Tab";
    } else {
      this.statusBarItem.text = `$(eye) Capture Tab Info (${this.activePage?.title})`;
    }
    this.statusBarItem.tooltip = this.isConnected
      ? `Connected to: ${this.activePage?.url}`
      : "Click to connect to a browser tab";
    this.statusBarItem.show();
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
