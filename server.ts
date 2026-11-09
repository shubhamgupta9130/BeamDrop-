import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '100mb' }));

// Helper to gather local network IP addresses
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses: { iface: string; address: string; family: string }[] = [];

  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (ifaceList) {
      for (const iface of ifaceList) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push({
            iface: name,
            address: iface.address,
            family: iface.family,
          });
        }
      }
    }
  }
  return addresses;
}

// Local network info endpoint so paired devices on the same Wi-Fi / Hotspot know where to connect
app.get('/api/network-info', (req, res) => {
  const localIps = getLocalIpAddresses();
  const hostHeader = req.headers.host || `localhost:${PORT}`;
  const protocol = req.headers['x-forwarded-proto'] || 'http';

  res.json({
    status: 'ok',
    port: PORT,
    currentHost: `${protocol}://${hostHeader}`,
    localIps: localIps.map((item) => ({
      ...item,
      url: `http://${item.address}:${PORT}`,
    })),
    timestamp: Date.now(),
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// WebSocket Server for local peer discovery, signaling & binary chunk relay
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Map<string, { ws: WebSocket; deviceId?: string; name?: string }>();

wss.on('connection', (ws: WebSocket) => {
  const connectionId = Math.random().toString(36).substring(2, 10);
  clients.set(connectionId, { ws });

  ws.on('message', (data: any) => {
    try {
      const message = JSON.parse(data.toString());

      // If client announced its device ID
      if (message.type === 'announce' && message.device) {
        const clientInfo = clients.get(connectionId);
        if (clientInfo) {
          clientInfo.deviceId = message.device.id;
          clientInfo.name = message.device.name;
        }
      }

      // Broadcast or routed message
      const targetId = message.receiverId || message.targetId;

      if (targetId) {
        // Targeted routing
        for (const [id, client] of clients.entries()) {
          if (client.deviceId === targetId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(data.toString());
          }
        }
      } else {
        // Broadcast to all other clients
        for (const [id, client] of clients.entries()) {
          if (id !== connectionId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(data.toString());
          }
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    const client = clients.get(connectionId);
    if (client?.deviceId) {
      const leaveMsg = JSON.stringify({
        type: 'leave',
        deviceId: client.deviceId,
      });
      for (const [id, c] of clients.entries()) {
        if (id !== connectionId && c.ws.readyState === WebSocket.OPEN) {
          c.ws.send(leaveMsg);
        }
      }
    }
    clients.delete(connectionId);
  });

  ws.on('error', (error: Error) => {
    console.error('WebSocket client error:', error);
  });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`BeamDrop server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
