import { ConsoleLoggerPlugin, InMemoryMetricsPlugin, serve, site } from '@serve0/core';

async function main() {
  const proxy = await serve({
    sites: [
      site('localhost', {
        route(req) {
          if (req.url?.startsWith('/api')) {
            return 'http://localhost:4000';
          }
          return 'http://localhost:3000';
        },
        // WebSocket support: proxy mode (automatically proxies to route target)
        // websocket: {
        //   config: {
        //     subprotocols: ['chat', 'json'],
        //     headers: { 'X-Custom-Header': 'value' }
        //   }
        // },
        // WebSocket support: server mode (handle connections directly)
        // websocket: {
        //   handler: async (socket: WebSocketConnection, req) => {
        //     socket.on('message', (data) => {
        //       console.log('Received:', data.toString());
        //       socket.send(`Echo: ${data.toString()}`);
        //     });
        //     socket.on('close', (code, reason) => {
        //       console.log('WebSocket closed:', code, reason);
        //     });
        //   }
        // }
      }),
    ],
    plugins: [new ConsoleLoggerPlugin(), new InMemoryMetricsPlugin()],
    port: 8080,
    host: '0.0.0.0',
  });

  await proxy.start();
  console.log('Serve0 proxy started on http://localhost:8080');
}

main().catch(console.error);
