/** @type {import('@vscode/test-cli').TestConfiguration} */
export default {
  files: "out/test/**/*.test.js",
  workspaceFolder: "test-workspace",
  mocha: {
    ui: "tdd",
    timeout: 20000,
  },
  version: "stable",
};
