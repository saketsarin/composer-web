import { exec } from "child_process";
import * as vscode from "vscode";
import { ToastService } from "./toast";

const toastService = ToastService.getInstance();

export async function clearClipboard(): Promise<void> {
  const platform = process.platform;
  let command: string | null = null;

  switch (platform) {
    case "darwin":
      command = "osascript -e \"set the clipboard to \"\"\"";
      break;
    case "win32":
      await vscode.env.clipboard.writeText("");
      return;
    case "linux":
      command = "xclip -selection clipboard -i /dev/null";
      break;
  }

  if (command) {
    await new Promise<void>((resolve, reject) => {
      exec(command!, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}

export async function copyImageToClipboard(imagePath: string): Promise<void> {
  const platform = process.platform;
  const command = getClipboardImageCommand(platform, imagePath);

  if (command) {
    await new Promise<void>((resolve, reject) => {
      exec(command, { timeout: 1000 }, (error: Error | null) => {
        if (error) {
          toastService.showError(
            `Failed to copy image to clipboard: ${error.message}`
          );
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}

export async function copyTextToClipboard(text: string): Promise<void> {
  const platform = process.platform;

  if (platform === "win32") {
    await vscode.env.clipboard.writeText(text);
    return;
  }

  const command = getClipboardTextCommand(platform, text);
  if (!command) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    exec(command, { timeout: 500 }, (error: Error | null) => {
      if (error) {
        toastService.showError(
          `Failed to copy text logs to clipboard: ${error.message}`
        );
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function getClipboardImageCommand(
  platform: string,
  imagePath: string
): string | null {
  switch (platform) {
    case "darwin":
      return `osascript -e '
        set imageFile to POSIX file "${imagePath}"
        set imageData to read imageFile as «class PNGf»
        set the clipboard to imageData
      '`;
    case "win32":
      return `powershell -NoProfile -Command "[Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.Clipboard]::SetImage([System.Drawing.Image]::FromFile('${imagePath.replace(
        /'/g,
        "''"
      )}'))"`;
    case "linux":
      return `xclip -selection clipboard -t image/png -i "${imagePath}"`;
    default:
      return null;
  }
}

function getClipboardTextCommand(
  platform: string,
  text: string
): string | null {
  switch (platform) {
    case "darwin":
      return `echo "${text.replace(/"/g, "\\\"")}" | pbcopy`;
    case "win32":
      return `powershell -command "Set-Clipboard -Value \\"${text.replace(
        /"/g,
        "`\""
      )}\\""`;
    case "linux":
      return `xclip -selection clipboard -in <<< "${text.replace(
        /"/g,
        "\\\""
      )}"`;
    default:
      return null;
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
