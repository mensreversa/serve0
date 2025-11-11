import { createHash } from 'crypto';
import { request as httpRequest, IncomingMessage } from 'http';
import { request as httpsRequest } from 'https';
import { Socket } from 'net';

export interface WebSocketConfig {
  subprotocols?: string[];
  headers?: Record<string, string>;
}

export interface WebSocketHandler {
  (socket: WebSocketConnection, req: IncomingMessage): void | Promise<void>;
}

export interface WebSocketConnection {
  send(data: string | Buffer | ArrayBuffer | ArrayBufferView): void;
  close(code?: number, reason?: string): void;
  on(event: 'message', handler: (data: Buffer) => void): void;
  on(event: 'close', handler: (code: number, reason: string) => void): void;
  on(event: 'error', handler: (error: Error) => void): void;
  readyState: number;
}

// WebSocket states
export const WS_READY = 1;
export const WS_CLOSING = 2;
export const WS_CLOSED = 3;

/**
 * Proxy WebSocket connection to upstream server
 */
export async function proxyWebSocket(
  req: IncomingMessage,
  socket: Socket,
  head: Buffer,
  target: string,
  config?: WebSocketConfig
): Promise<void> {
  const targetUrl = new URL(target + (req.url || ''));
  const isTls = targetUrl.protocol === 'wss:' || targetUrl.protocol === 'https:';
  const requestFn = isTls ? httpsRequest : httpRequest;

  // Prepare headers for upgrade request
  const headers: Record<string, string | string[]> = {
    ...req.headers,
    host: targetUrl.host,
    connection: 'Upgrade',
    upgrade: 'websocket',
  };

  // Add subprotocols if specified
  if (config?.subprotocols && config.subprotocols.length > 0) {
    headers['sec-websocket-protocol'] = config.subprotocols.join(', ');
  }

  // Add custom headers
  if (config?.headers) {
    Object.assign(headers, config.headers);
  }

  const proxyReq = requestFn({
    protocol: isTls ? 'https:' : 'http:',
    hostname: targetUrl.hostname,
    port: targetUrl.port || (isTls ? 443 : 80),
    path: targetUrl.pathname + targetUrl.search,
    method: 'GET',
    headers,
  });

  let upgradeHandled = false;

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    if (upgradeHandled) return;
    upgradeHandled = true;

    // Validate upgrade response
    if (proxyRes.statusCode !== 101) {
      socket.destroy();
      return;
    }

    // Send upgrade response to client
    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
    ];

    // Forward Sec-WebSocket-Accept if present
    const acceptHeader = proxyRes.headers['sec-websocket-accept'];
    if (acceptHeader) {
      responseHeaders.push(`Sec-WebSocket-Accept: ${acceptHeader}`);
    }

    // Forward subprotocol if negotiated
    const protocolHeader = proxyRes.headers['sec-websocket-protocol'];
    if (protocolHeader) {
      responseHeaders.push(`Sec-WebSocket-Protocol: ${protocolHeader}`);
    }

    // Forward extension headers if present
    const extensions = proxyRes.headers['sec-websocket-extensions'];
    if (extensions) {
      responseHeaders.push(`Sec-WebSocket-Extensions: ${extensions}`);
    }

    socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');

    // Write any buffered data
    if (head && head.length > 0) {
      proxySocket.write(head);
    }
    if (proxyHead && proxyHead.length > 0) {
      socket.write(proxyHead);
    }

    // Bi-directional piping
    proxySocket.pipe(socket, { end: false });
    socket.pipe(proxySocket, { end: false });

    // Handle connection cleanup
    const cleanup = () => {
      try {
        proxySocket.destroy();
        socket.destroy();
      } catch {
        // Ignore errors during socket destruction
      }
    };

    proxySocket.on('close', cleanup);
    proxySocket.on('error', cleanup);
    socket.on('close', cleanup);
    socket.on('error', cleanup);
  });

  proxyReq.on('error', (error) => {
    if (!upgradeHandled) {
      console.error('WebSocket proxy error:', error);
      try {
        socket.destroy();
      } catch {
        // Ignore errors during socket destruction
      }
    }
  });

  proxyReq.on('response', (res) => {
    // If we get a response instead of upgrade, the upgrade failed
    if (!upgradeHandled && res.statusCode !== 101) {
      console.error(`WebSocket upgrade failed: ${res.statusCode} ${res.statusMessage}`);
      socket.destroy();
    }
  });

  proxyReq.end();
}

/**
 * Create a WebSocket server handler
 */
export function createWebSocketHandler(
  handler: WebSocketHandler
): (req: IncomingMessage, socket: Socket, head: Buffer) => void {
  return async (req: IncomingMessage, socket: Socket, head: Buffer) => {
    try {
      // Validate WebSocket upgrade request
      if (req.headers.upgrade?.toLowerCase() !== 'websocket') {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }

      const key = req.headers['sec-websocket-key'];
      if (!key) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }

      // Create WebSocket connection wrapper
      const connection = createWebSocketConnection(
        socket,
        key,
        req.headers['sec-websocket-protocol']
      );

      // Send upgrade response
      const accept = generateAccept(key);
      const responseHeaders = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${accept}`,
      ];

      const protocol = req.headers['sec-websocket-protocol'];
      if (protocol) {
        responseHeaders.push(`Sec-WebSocket-Protocol: ${protocol}`);
      }

      socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');

      // Process any buffered data (first WebSocket frame)
      if (head && head.length > 0) {
        // Feed the head buffer into the connection's frame processor
        (connection as any)._processFrameData(head);
      }

      // Call user handler
      await handler(connection, req);
    } catch (error) {
      console.error('WebSocket server error:', error);
      try {
        socket.destroy();
      } catch {
        // Ignore errors during socket destruction
      }
    }
  };
}

/**
 * Create a WebSocket connection wrapper
 */
function createWebSocketConnection(
  socket: Socket,
  _key: string,
  _protocol?: string | string[]
): WebSocketConnection {
  let readyState = WS_READY;
  const messageHandlers: Array<(data: Buffer) => void> = [];
  const closeHandlers: Array<(code: number, reason: string) => void> = [];
  const errorHandlers: Array<(error: Error) => void> = [];
  let frameBuffer = Buffer.alloc(0);

  // Handle incoming data (WebSocket frames)
  socket.on('data', (data: Buffer) => {
    frameBuffer = Buffer.concat([frameBuffer, data]);
    _processFrames();
  });

  function _processFrames() {
    while (frameBuffer.length >= 2) {
      const _fin = (frameBuffer[0] & 0x80) !== 0;
      const opcode = frameBuffer[0] & 0x0f;
      const masked = (frameBuffer[1] & 0x80) !== 0;
      let payloadLength = frameBuffer[1] & 0x7f;

      let headerLength = 2;
      if (payloadLength === 126) {
        if (frameBuffer.length < 4) return;
        payloadLength = frameBuffer.readUInt16BE(2);
        headerLength = 4;
      } else if (payloadLength === 127) {
        if (frameBuffer.length < 10) return;
        payloadLength = Number(frameBuffer.readBigUInt64BE(2));
        headerLength = 10;
      }

      const maskKey = masked ? 4 : 0;
      const totalLength = headerLength + maskKey + payloadLength;

      if (frameBuffer.length < totalLength) return;

      if (opcode === 0x8) {
        // Close frame
        const code = payloadLength >= 2 ? frameBuffer.readUInt16BE(headerLength + maskKey) : 1000;
        const reason =
          payloadLength > 2
            ? frameBuffer.toString('utf8', headerLength + maskKey + 2, totalLength)
            : '';
        readyState = WS_CLOSED;
        closeHandlers.forEach((h) => h(code, reason));
        socket.destroy();
        return;
      } else if (opcode === 0x9) {
        // Ping frame - respond with pong
        const pongFrame = Buffer.alloc(2);
        pongFrame[0] = 0x8a; // FIN + PONG
        pongFrame[1] = 0x00;
        socket.write(pongFrame);
      } else if (opcode === 0x1 || opcode === 0x2) {
        // Text or binary frame
        const payload = frameBuffer.subarray(headerLength + maskKey, totalLength);
        if (masked) {
          const mask = frameBuffer.subarray(headerLength, headerLength + 4);
          for (let i = 0; i < payload.length; i++) {
            payload[i] ^= mask[i % 4];
          }
        }
        messageHandlers.forEach((h) => h(payload));
      }

      frameBuffer = frameBuffer.subarray(totalLength);
    }
  }

  const connection: WebSocketConnection = {
    send(data: string | Buffer | ArrayBuffer | ArrayBufferView) {
      if (readyState !== WS_READY) return;

      let buffer: Buffer;
      if (Buffer.isBuffer(data)) {
        buffer = data;
      } else if (typeof data === 'string') {
        buffer = Buffer.from(data, 'utf8');
      } else if (data instanceof ArrayBuffer) {
        buffer = Buffer.from(data);
      } else {
        buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      }

      const frame = Buffer.alloc(2 + buffer.length);
      frame[0] = 0x81; // FIN + TEXT
      frame[1] = buffer.length;
      buffer.copy(frame, 2);
      socket.write(frame);
    },

    close(code = 1000, reason = '') {
      if (readyState === WS_CLOSED || readyState === WS_CLOSING) return;
      readyState = WS_CLOSING;

      const closeFrame = Buffer.alloc(2 + (reason ? 2 + Buffer.byteLength(reason) : 0));
      closeFrame[0] = 0x88; // FIN + CLOSE
      if (reason) {
        closeFrame[1] = 2 + Buffer.byteLength(reason);
        closeFrame.writeUInt16BE(code, 2);
        closeFrame.write(reason, 4, 'utf8');
      } else {
        closeFrame[1] = 2;
        closeFrame.writeUInt16BE(code, 2);
      }
      socket.write(closeFrame);
      readyState = WS_CLOSED;
      socket.destroy();
    },

    on(event: 'message' | 'close' | 'error', handler: any) {
      if (event === 'message') {
        messageHandlers.push(handler);
      } else if (event === 'close') {
        closeHandlers.push(handler);
      } else if (event === 'error') {
        errorHandlers.push(handler);
      }
    },

    get readyState() {
      return readyState;
    },
  };

  // Internal method to process frame data (not part of public interface)
  (connection as any)._processFrameData = (data: Buffer) => {
    frameBuffer = Buffer.concat([frameBuffer, data]);
    _processFrames();
  };

  socket.on('error', (error) => {
    errorHandlers.forEach((h) => h(error));
  });

  socket.on('close', () => {
    readyState = WS_CLOSED;
    closeHandlers.forEach((h) => h(1006, 'Connection closed'));
  });

  return connection;
}

/**
 * Generate Sec-WebSocket-Accept header value
 */
function generateAccept(key: string): string {
  const WS_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  return createHash('sha1')
    .update(key + WS_MAGIC)
    .digest('base64');
}
