import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import {
  LogData,
  BrowserLog,
  NetworkRequest,
  Exception,
  DOMEvent,
} from "../types";
import {
  clearClipboard,
  copyImageToClipboard,
  copyTextToClipboard,
  delay,
} from "../utils/clipboard";
import { ToastService } from "../utils/toast";

export class ComposerIntegration {
  private static instance: ComposerIntegration;
  private readonly context: vscode.ExtensionContext;
  private composerOpened: boolean = false;
  private toastService: ToastService;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.toastService = ToastService.getInstance();
  }

  public static getInstance(
    context: vscode.ExtensionContext
  ): ComposerIntegration {
    if (!ComposerIntegration.instance) {
      ComposerIntegration.instance = new ComposerIntegration(context);
    }
    return ComposerIntegration.instance;
  }

  private async openComposer(): Promise<void> {
    if (this.composerOpened) {
      return;
    }
    try {
      await vscode.commands.executeCommand("aichat.newchataction");
      this.composerOpened = true;
      await delay(100);
    } catch {
      this.toastService.showError(
        "Failed to open composer. Please make sure Cursor is installed and configured."
      );
      return;
    }
  }

  public async sendToComposer(
    screenshot?: Buffer,
    logs?: LogData
  ): Promise<void> {
    const maxRetries = 2;
    let imageAttempt = 0;
    let textAttempt = 0;
    let imageSuccess = false;
    let textSuccess = false;

    const formattedLogs = logs ? this.formatLogs(logs) : "";

    while (
      (screenshot && !imageSuccess && imageAttempt <= maxRetries) ||
      (formattedLogs && !textSuccess && textAttempt <= maxRetries)
    ) {
      try {
        await this.openComposer();

        if (screenshot && !imageSuccess) {
          await clearClipboard();
          try {
            await this.sendImageToComposer(screenshot);
            await delay(50);
            await vscode.commands.executeCommand(
              "editor.action.clipboardPasteAction"
            );
            imageSuccess = true;
          } catch (err) {
            if (imageAttempt === maxRetries) {
              throw new Error(`Failed to send image: ${String(err)}`);
            }
            imageAttempt++;
            await delay(50);
          }
        }

        if (formattedLogs && !textSuccess) {
          await delay(50);
          await clearClipboard();
          try {
            await this.prepareTextForComposer(formattedLogs);
            await delay(50);
            await vscode.commands.executeCommand(
              "editor.action.clipboardPasteAction"
            );
            textSuccess = true;
          } catch (err) {
            if (textAttempt === maxRetries) {
              throw new Error(`Failed to send logs: ${String(err)}`);
            }
            textAttempt++;
            await delay(50);
          }
        }

        if ((!screenshot || imageSuccess) && (!formattedLogs || textSuccess)) {
          await this.showSuccessNotification();
          return;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.toastService.showError(
          `Failed to send data to composer: ${errorMessage}`
        );
        throw error;
      } finally {
        this.composerOpened = false;
      }
    }
  }

  public async sendiOSToComposer(screenshot?: Buffer): Promise<void> {
    const maxRetries = 2;
    let imageAttempt = 0;
    let imageSuccess = false;

    while (screenshot && !imageSuccess && imageAttempt <= maxRetries) {
      try {
        await this.openComposer();

        if (screenshot && !imageSuccess) {
          await clearClipboard();
          try {
            await this.sendImageToComposer(screenshot);
            await delay(50);
            await vscode.commands.executeCommand(
              "editor.action.clipboardPasteAction"
            );
            imageSuccess = true;
          } catch (err) {
            if (imageAttempt === maxRetries) {
              throw new Error(`Failed to send image: ${String(err)}`);
            }
            imageAttempt++;
            await delay(50);
          }
        }

        if (!screenshot || imageSuccess) {
          await this.showSuccessNotification();
          return;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.toastService.showError(
          `Failed to send iOS data to composer: ${errorMessage}`
        );
        throw error;
      } finally {
        this.composerOpened = false;
      }
    }
  }

  private async sendImageToComposer(screenshot: Buffer): Promise<void> {
    const manifest = require("../../../package.json");
    const extensionId = `${manifest.publisher}.${manifest.name}`;
    const tmpDir = this.context.globalStorageUri.fsPath;
    let tmpFile: string | undefined;

    try {
      const tmpFilePath = path.join(
        tmpDir,
        `${extensionId}-preview-${Date.now()}.png`
      );

      await Promise.all([
        fs.mkdir(tmpDir, { recursive: true }),
        fs.writeFile(tmpFilePath, screenshot),
      ]);
      tmpFile = tmpFilePath;

      await copyImageToClipboard(tmpFile);
      await delay(50);
    } catch (error) {
      throw new Error(`Failed to send image: ${error}`);
    } finally {
      if (tmpFile) {
        fs.unlink(tmpFile).catch((error) =>
          console.error("Failed to clean up temporary file:", error)
        );
      }
    }
  }

  private async prepareTextForComposer(text: string): Promise<void> {
    if (!text) {
      return;
    }

    await copyTextToClipboard(text);
    await delay(50);
  }

  private async showSuccessNotification() {
    await this.toastService.showProgress(
      "Successfully sent to Composer",
      async () => {
        await delay(2000);
      }
    );
  }

  private formatLogs(logs: LogData): string {
    let result = "---Console Logs---\n";
    logs.console.forEach((log: BrowserLog) => {
      const timestamp = new Date(log.timestamp).toLocaleTimeString();
      let prefix = "";

      switch (log.type) {
        case "error":
          prefix = "ERROR";
          break;
        case "warning":
          prefix = "WARN";
          break;
        case "debug":
          prefix = "DEBUG";
          break;
        case "info":
          prefix = "INFO";
          break;
        default:
          prefix = "LOG";
      }

      result += `${timestamp} [${prefix}] ${log.message}\n`;
    });

    if (logs.network && logs.network.length > 0) {
      result += "\n---Network Requests---\n";
      logs.network.forEach((req: NetworkRequest) => {
        const timestamp = new Date(req.timestamp).toLocaleTimeString();
        const duration = req.duration ? `${req.duration}ms` : "pending";
        const status = req.status ? `${req.status}` : "N/A";
        result += `${timestamp} [${req.method}] ${req.url} - Status: ${status}, Duration: ${duration}\n`;
      });
    }

    if (logs.exceptions && logs.exceptions.length > 0) {
      result += "\n---Exceptions---\n";
      logs.exceptions.forEach((ex: Exception) => {
        const timestamp = new Date(ex.timestamp).toLocaleTimeString();
        result += `${timestamp} - ${ex.message}\n${ex.stack || ""}\n`;
      });
    }

    if (logs.domEvents && logs.domEvents.length > 0) {
      result += "\n---DOM Events---\n";
      logs.domEvents.forEach((event: DOMEvent) => {
        const timestamp = new Date(event.timestamp).toLocaleTimeString();
        result += `${timestamp} - [${event.type}] ${event.target}\n`;
      });
    }

    return result;
  }
}
