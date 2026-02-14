import { WebSocketServer } from 'ws';
import http from 'http';
import * as map from 'lib0/map';

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;
const pingTimeout = Number(process.env.PING_TIMEOUT_MS ?? '30000');

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || '4444');

const wss = new WebSocketServer({ noServer: true });

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify({ ok: true, service: 'chartmaker-signaling' }));
});

/** @type {Map<string, Set<any>>} */
const topics = new Map();

const send = (conn, message) => {
  if (conn.readyState !== wsReadyStateConnecting && conn.readyState !== wsReadyStateOpen) {
    conn.close();
    return;
  }

  try {
    conn.send(JSON.stringify(message));
  } catch {
    conn.close();
  }
};

const onconnection = (conn) => {
  /** @type {Set<string>} */
  const subscribedTopics = new Set();
  let closed = false;
  let pongReceived = true;

  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      conn.close();
      clearInterval(pingInterval);
      return;
    }

    pongReceived = false;
    try {
      conn.ping();
    } catch {
      conn.close();
    }
  }, pingTimeout);

  conn.on('pong', () => {
    pongReceived = true;
  });

  conn.on('close', () => {
    clearInterval(pingInterval);
    subscribedTopics.forEach((topicName) => {
      const subs = topics.get(topicName) || new Set();
      subs.delete(conn);
      if (subs.size === 0) {
        topics.delete(topicName);
      }
    });
    subscribedTopics.clear();
    closed = true;
  });

  conn.on('message', (message) => {
    if (typeof message === 'string' || message instanceof Buffer) {
      message = JSON.parse(message);
    }

    if (!message || !message.type || closed) {
      return;
    }

    switch (message.type) {
      case 'subscribe':
        /** @type {Array<string>} */
        (message.topics || []).forEach((topicName) => {
          if (typeof topicName === 'string') {
            const topic = map.setIfUndefined(topics, topicName, () => new Set());
            topic.add(conn);
            subscribedTopics.add(topicName);
          }
        });
        break;
      case 'unsubscribe':
        /** @type {Array<string>} */
        (message.topics || []).forEach((topicName) => {
          const subs = topics.get(topicName);
          if (subs) {
            subs.delete(conn);
          }
        });
        break;
      case 'publish':
        if (message.topic) {
          const receivers = topics.get(message.topic);
          if (receivers) {
            message.clients = receivers.size;
            receivers.forEach((receiver) => send(receiver, message));
          }
        }
        break;
      case 'ping':
        send(conn, { type: 'pong' });
        break;
      default:
        break;
    }
  });
};

wss.on('connection', onconnection);

server.on('upgrade', (request, socket, head) => {
  const handleAuth = (ws) => {
    wss.emit('connection', ws, request);
  };
  wss.handleUpgrade(request, socket, head, handleAuth);
});

server.listen(port, host, () => {
  console.log(`Signaling server listening on ${host}:${port}`);
});

const shutdown = () => {
  wss.clients.forEach((client) => client.close());
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
