# ChartMaker Signaling Server

Folder ini adalah service signaling WebRTC untuk ChartMaker.  
Service ini dipakai sebagai service kedua di Railway dari repo yang sama.

## Local Run

```bash
npm --prefix signaling-server install
npm run dev:signaling
```

Default port mengikuti env `PORT` (fallback `4444`).

## Railway Deployment (Same Repo, Two Services)

1. Pastikan repo ini sudah terhubung ke Railway.
2. Buat service web (Next.js) dari root repo `/`.
3. Buat service kedua untuk signaling dari repo yang sama.
4. Pada service signaling:
   - Set `Root Directory` ke `signaling-server`
   - Build command: `npm install`
   - Start command: `npm run start`
5. Generate public domain untuk service signaling.
6. Cek domain signaling membuka response `okay`:
   - `https://<your-signaling-service>.up.railway.app`
7. Pada service web, set env:
   - `NEXT_PUBLIC_WEBRTC_URL=wss://<your-signaling-service>.up.railway.app`
8. Redeploy service web agar env publik terikut di build.

## Notes

- Signaling server hanya untuk handshake peer WebRTC, bukan penyimpanan dokumen.
- Jangan arahkan `NEXT_PUBLIC_WEBRTC_URL` ke domain app Next.js.
- Hindari host default publik yang tidak stabil untuk production.
