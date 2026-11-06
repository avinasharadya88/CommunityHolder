import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createApp } from './app.js';
import { CONFIG } from './config.js';

const app = createApp();
const server = http.createServer(app);

// Real-Time Intercom & Notification WebSocket Server
export const wss = new WebSocketServer({ server, path: '/ws' });

export const connectedClients: Map<string, WebSocket> = new Map();

wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const clientKey = url.searchParams.get('client_key') || 'anonymous';
  connectedClients.set(clientKey, ws);

  ws.send(
    JSON.stringify({
      type: 'CONNECTED',
      client_key: clientKey,
      timestamp: new Date().toISOString(),
    })
  );

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      // Broadcast or echo signaling packets
      if (data.type === 'INTERCOM_RING' || data.type === 'INTERCOM_DECISION') {
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      }
    } catch (e) {
      // Ignore invalid JSON
    }
  });

  ws.on('close', () => {
    connectedClients.delete(clientKey);
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(CONFIG.PORT, '0.0.0.0', () => {
    console.log(`[CommunityHolder API] Server listening on http://0.0.0.0:${CONFIG.PORT}`);
    console.log(`[CommunityHolder Realtime] WebSocket server active at ws://0.0.0.0:${CONFIG.PORT}/ws`);
  });
}

export { server, app };

