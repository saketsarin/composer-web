import * as path from "path";
import Mocha from "mocha";
import fg from "fast-glob";

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: "tdd",
    color: true,
    timeout: 20000,
  });

  const testsRoot = path.resolve(__dirname, "..");

  return new Promise<void>((resolve, reject) => {
    try {
      // Find all test files
      const testFiles = fg.sync("**/**.test.js", {
        cwd: testsRoot,
        absolute: false,
      });

      // Add files to the test suite
      testFiles.forEach((f: string) => {
        mocha.addFile(path.resolve(testsRoot, f));
      });

      // Run the mocha test
      mocha.run((failures: number) => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`));
        } else {
          resolve();
        }
      });
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
}
