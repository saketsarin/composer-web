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
      "web-preview.connectTab",
      "web-preview.captureTab",
      "web-preview.smartCapture",
    ];

    for (const cmd of requiredCommands) {
      assert.ok(
        commands.includes(cmd),
        `Command "${cmd}" should be registered`
      );
    }
  });
});
