import * as puppeteer from "puppeteer-core";
import { BrowserLogHandler } from "../utils/log-handler";

export class BrowserEventHandlers {
  private logHandler: BrowserLogHandler;

  constructor(logHandler: BrowserLogHandler) {
    this.logHandler = logHandler;
  }

  public setupEventListeners(client: puppeteer.CDPSession): void {
    client.on("Runtime.consoleAPICalled", (e) => {
      this.logHandler.handleConsoleMessage(e);
    });

    client.on("Runtime.exceptionThrown", (e) => {
      this.logHandler.handleConsoleMessage({
        type: "error",
        args: [
          {
            type: "error",
            subtype: "error",
            description:
              e.exceptionDetails.exception?.description ||
              e.exceptionDetails.text,
            preview: {
              properties: e.exceptionDetails.stackTrace
                ? [
                    {
                      name: "stack",
                      value: e.exceptionDetails.stackTrace.callFrames
                        .map(
                          (frame) =>
                            `    at ${frame.functionName || "(anonymous)"} (${
                              frame.url
                            }:${frame.lineNumber + 1}:${
                              frame.columnNumber + 1
                            })`
                        )
                        .join("\n"),
                    },
                  ]
                : [],
            },
          },
        ],
      });
    });

    client.on("Network.requestWillBeSent", (request) => {
      this.logHandler.handleNetworkRequest(request);
    });

    client.on("Network.responseReceived", (response) => {
      this.logHandler.updateNetworkResponse(response);
    });

    client.on("Log.entryAdded", (entry) => {
      // Map browser log entry to console entry
      this.logHandler.handleConsoleMessage({
        type: entry.entry.level,
        args: [
          {
            type: "string",
            value: entry.entry.text,
          },
        ],
      });
    });
  }
}
