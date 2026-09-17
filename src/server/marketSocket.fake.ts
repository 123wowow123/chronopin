// A stand-in for Node's WebSocket in the market stream tests: records what is
// sent, and lets a test open, answer and close it.

export class FakeSocket {
  static CLOSED = 3;
  static sockets: FakeSocket[] = [];
  readyState = 0;
  sent: any[] = [];
  onopen?: () => void;
  onmessage?: (event: { data: string }) => void;
  onclose?: (event: { code: number }) => void;

  constructor(
    public url: string,
    public init: { headers: Record<string, string> },
  ) {
    FakeSocket.sockets.push(this);
  }

  static get last() {
    return FakeSocket.sockets[FakeSocket.sockets.length - 1];
  }

  send(data: string) {
    let parsed: unknown = data;
    try {
      parsed = JSON.parse(data);
    } catch {
      // A text frame, e.g. a ping.
    }
    this.sent.push(parsed);
  }

  close() {
    this.readyState = FakeSocket.CLOSED;
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
  }

  reply(message: object | string) {
    this.onmessage?.({ data: typeof message === 'string' ? message : JSON.stringify(message) });
  }
}

// Lets queued microtasks (a stream's sync) run.
export const flush = () => new Promise((resolve) => setImmediate(resolve));
