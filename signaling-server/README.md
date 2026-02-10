# ChartMaker Signaling Server (Production)

This folder contains a minimal production signaling server for WebRTC collaboration.

## Deploy to Railway

1. Create a new Railway project.
2. Add a new service from this folder.
3. Railway will run `npm install` and `npm start` automatically.
4. Copy the Railway public URL (HTTPS).
5. Set your app env:
   `NEXT_PUBLIC_WEBRTC_URL="wss://your-railway-app.up.railway.app"`

## Notes

- The server only provides signaling. The document data is P2P between clients.
- Use a stable URL and keep the service always on for best collaboration.
