import { getApiToken, getGuestJwt } from './auth';
import { OddsUpdate, ScoreUpdate } from './types';

const TXLINE_BASE_URL = process.env.TXLINE_BASE_URL || 'https://txline.txodds.com';

type OddsCallback = (update: OddsUpdate) => void;
type ScoreCallback = (update: ScoreUpdate) => void;
type ErrorCallback = (error: Error) => void;
type ReconnectCallback = (attempt: number) => void;

interface StreamOptions {
  onOdds?: OddsCallback;
  onScores?: ScoreCallback;
  onError?: ErrorCallback;
  onReconnect?: ReconnectCallback;
  maxRetryInterval?: number; // ms, default 60000
}

abstract class BaseSSEStream {
  protected url: string;
  protected options: StreamOptions;
  protected maxRetry: number;
  protected retryCount = 0;
  protected controller: AbortController | null = null;
  protected running = false;

  constructor(url: string, options: StreamOptions) {
    this.url = url;
    this.options = options;
    this.maxRetry = options.maxRetryInterval || 60000;
  }

  async start(): Promise<void> {
    this.running = true;
    await this.connect();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }

  private async connect(): Promise<void> {
    if (!this.running) return;

    const apiToken = getApiToken() || process.env.TXLINE_API_TOKEN;
    if (!apiToken) {
      this.options.onError?.(new Error('No API token for streaming'));
      return;
    }

    const jwt = await getGuestJwt();
    this.controller = new AbortController();

    try {
      const response = await fetch(this.url, {
        headers: {
          Authorization: `Bearer ${jwt}`,
          'X-Api-Token': apiToken,
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        signal: this.controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Stream failed: ${response.status} ${response.statusText}`);
      }

      this.retryCount = 0;

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (this.running) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            this.processLine(line);
          }
        }
      }
    } catch (err) {
      if (!this.running) return;
      this.options.onError?.(err as Error);
      await this.reconnect();
    }
  }

  private async reconnect(): Promise<void> {
    if (!this.running) return;

    this.retryCount++;
    const delay = Math.min(1000 * Math.pow(2, this.retryCount - 1), this.maxRetry);
    this.options.onReconnect?.(this.retryCount);

    await new Promise((resolve) => setTimeout(resolve, delay));
    await this.connect();
  }

  protected abstract processLine(line: string): void;
}

export class OddsStream extends BaseSSEStream {
  constructor(options: StreamOptions) {
    super(`${TXLINE_BASE_URL}/api/odds/stream`, options);
  }

  protected processLine(line: string): void {
    try {
      const data = JSON.parse(line) as OddsUpdate;
      this.options.onOdds?.(data);
    } catch {
      // Non-JSON line (e.g., SSE comment), skip
    }
  }
}

export class ScoresStream extends BaseSSEStream {
  constructor(options: StreamOptions) {
    super(`${TXLINE_BASE_URL}/api/scores/stream`, options);
  }

  protected processLine(line: string): void {
    try {
      const data = JSON.parse(line) as ScoreUpdate;
      this.options.onScores?.(data);
    } catch {
      // Non-JSON line, skip
    }
  }
}

export class TxLineStreamManager {
  private oddsStream: OddsStream | null = null;
  private scoresStream: ScoresStream | null = null;

  async start(options: StreamOptions): Promise<void> {
    this.oddsStream = new OddsStream(options);
    this.scoresStream = new ScoresStream(options);

    await Promise.all([this.oddsStream.start(), this.scoresStream.start()]);
  }

  async stop(): Promise<void> {
    await Promise.all([this.oddsStream?.stop(), this.scoresStream?.stop()]);
  }
}
