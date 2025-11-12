import { IncomingMessage, ServerResponse } from 'http';
import { createServer as createHttpsServer, Server } from 'https';
import { ProxyContext } from '../types.js';
import { handleRequest } from './http.js';

export interface HttpsServerOptions {
  key: string;
  cert: string;
}

export function createHttpsServerInstance(options: HttpsServerOptions, ctx: ProxyContext): Server {
  return createHttpsServer(
    {
      key: options.key,
      cert: options.cert,
    },
    async (req: IncomingMessage, res: ServerResponse) => {
      await handleRequest(req, res, ctx);
    }
  );
}
