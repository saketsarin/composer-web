import * as vscode from "vscode";

export class WebviewManager {
  private static instance: WebviewManager;
  private panels: Map<string, vscode.WebviewPanel> = new Map();

  private constructor() {}

  public static getInstance(): WebviewManager {
    if (!WebviewManager.instance) {
      WebviewManager.instance = new WebviewManager();
    }
    return WebviewManager.instance;
  }

  public createOrShow(
    viewType: string,
    title: string,
    showOptions: {
      column?: vscode.ViewColumn;
      preserveFocus?: boolean;
    } = {},
    options: vscode.WebviewPanelOptions & vscode.WebviewOptions = {
      enableScripts: true,
    }
  ): vscode.WebviewPanel {
    const column =
      showOptions.column ||
      vscode.window.activeTextEditor?.viewColumn ||
      vscode.ViewColumn.One;

    // If we already have a panel, show it
    if (this.panels.has(viewType)) {
      const panel = this.panels.get(viewType)!;
      panel.reveal(column, showOptions.preserveFocus);
      return panel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      viewType,
      title,
      column,
      options
    );

    // Add it to our map
    this.panels.set(viewType, panel);

    // When the panel is closed, remove it from the map
    panel.onDidDispose(() => this.panels.delete(viewType));

    return panel;
  }

  public getPanel(viewType: string): vscode.WebviewPanel | undefined {
    return this.panels.get(viewType);
  }

  public postMessage(
    viewType: string,
    message: any
  ): Thenable<boolean> | undefined {
    const panel = this.panels.get(viewType);
    if (panel) {
      return panel.webview.postMessage(message);
    }
    return undefined;
  }

  public registerMessageHandler(
    panel: vscode.WebviewPanel,
    handler: (message: any) => void,
    disposables: vscode.Disposable[]
  ): void {
    panel.webview.onDidReceiveMessage(handler, null, disposables);
  }

  public closePanel(viewType: string): void {
    const panel = this.panels.get(viewType);
    if (panel) {
      panel.dispose();
      this.panels.delete(viewType);
    }
  }

  public closeAll(): void {
    this.panels.forEach((panel) => {
      panel.dispose();
    });
    this.panels.clear();
  }
}
