import { mapNetworkErrorMessage } from '../network-error';
import { SignalingMessage, SignalingTransport, TransportStatus } from '@/types/webrtc';
import { getErrorText } from '../getError';

/**
 * WebSocket-based implementation of the signaling transport.
 */
export class WebSocketTransport implements SignalingTransport {
  // Current lifecycle status
  public status: TransportStatus = 'closed';

  // WebSocket instance
  private ws: WebSocket | null = null;

  // Registered listeners
  private handlers: ((msg: SignalingMessage) => void)[] = [];

  constructor(private url: string) {}

  /**
   * Opens the WebSocket connection.
   * Resolves once the connection is established.
   * Subsequent calls are no-ops if already connected.
   */
  connect(): Promise<void> {
    // Already connected, does nothing
    if (this.ws) return Promise.resolve();

    this.status = 'connecting';

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);

      // Establish connection
      ws.onopen = () => {
        this.status = 'open';
        this.ws = ws;
        resolve();
      };

      // Parse incoming messages and forward them to listeners
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as SignalingMessage;
          this.handlers.forEach((cb) => cb(msg));
        } catch (err) {
          console.error('Failed to parse signaling message:', err);
        }
      };

      // Connection-level error (usually fatal)
      ws.onerror = (e: any) => {
        // Make sure we always map a non-empty, informative string
        const raw = `Websocket error to ${this.url} - ${getErrorText(e) || getErrorText(e?.error)}`;
        const friendly = mapNetworkErrorMessage(raw);
        const error = new Error(friendly);
        (error as { cause?: unknown }).cause = raw;

        console.error('Websocket error', e);
        this.status = 'closed';
        reject(error);
      };

      // Remote or local close
      ws.onclose = (event: any) => {
        // `context + url + code + reason`
        const raw = `WebSocket closed to ${this.url} — code=${event?.code} reason=${event?.reason ?? ''}`;

        if (this.status == 'connecting') {
          const friendly = mapNetworkErrorMessage(raw);
          const error = new Error(friendly);
          (error as { cause?: unknown }).cause = raw;

          this.status = 'closed';
          this.ws = null;
          reject(error);
          return;
        }

        this.status = 'closed';
        this.ws = null;
      };
    });
  }

  /**
   * Sends a signaling message over the socket.
   * Throws if the socket is not currently open.
   */
  send(msg: SignalingMessage) {
    if (this.status !== 'open' || !this.ws) {
      throw new Error('WebSocket is not open');
    }
    this.ws.send(JSON.stringify(msg));
  }

  /**
   * Registers a handler for incoming signaling messages.
   * Handlers are invoked in the order they are added.
   */
  onMessage(handler: (msg: SignalingMessage) => void) {
    this.handlers.push(handler);
  }

  /**
   * Closes the WebSocket connection and clears internal state.
   * Event handlers are removed to avoid callbacks during teardown.
   */
  disconnect() {
    if (!this.ws) return;

    this.status = 'closing';

    // Prevent callbacks during teardown
    this.ws.onerror = null;
    this.ws.onclose = null;
    this.ws.onmessage = null;

    this.ws.close();
    this.ws = null;

    this.status = 'closed';
  }
}
