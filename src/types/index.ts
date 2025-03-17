export interface BrowserLog {
  type: string;
  args: string[];
  timestamp: number;
}

export interface NetworkRequest {
  url: string;
  status: number;
  error?: string;
  timestamp: number;
}

export interface MonitoredPage {
  title: string;
  url: string;
  id: string;
}

export interface ExtensionConfig {
  captureFormat: "png" | "jpg";
  includeStyles: boolean;
  quality: number;
  remoteDebuggingUrl: string;
  customKeybindings?: KeybindConfig[];
}

export interface KeybindConfig {
  command: string;
  key: string;
  mac: string;
}

export interface LogData {
  console: BrowserLog[];
  network: NetworkRequest[];
}
