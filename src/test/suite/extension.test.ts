import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  suiteSetup(async () => {
    // Activate the extension before running tests
    await vscode.extensions.getExtension("saketsarin.composer-web")?.activate();
  });

  test("Extension should be present", () => {
    const extension = vscode.extensions.getExtension("saketsarin.composer-web");
    assert.ok(extension, "Extension should be available");
  });

  test("Should register all commands", async () => {
    // Get all commands
    const commands = await vscode.commands.getCommands(true);

    // Check each command
    const requiredCommands = [
      "web-preview.smartCapture",
      "web-preview.clearLogs",
      "web-preview.sendLogs",
      "web-preview.sendScreenshot",
    ];

    for (const cmd of requiredCommands) {
      assert.ok(
        commands.includes(cmd),
        `Command "${cmd}" should be registered`
      );
    }
  });

  test("Commands should be available only when connected", async () => {
    const restrictedCommands = [
      "web-preview.clearLogs",
      "web-preview.sendLogs",
      "web-preview.sendScreenshot",
    ];

    const packageJson = require("../../../package.json");
    const commandPalette = packageJson.contributes.menus.commandPalette;

    for (const cmd of restrictedCommands) {
      const cmdConfig = commandPalette.find((c: any) => c.command === cmd);
      assert.strictEqual(
        cmdConfig?.when,
        "web-preview:isConnected",
        `Command "${cmd}" should only be available when connected`
      );
    }
  });
});
