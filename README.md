# PairChat

A tiny chat app: two people each type a 4-digit code, and if the codes
match they get connected and can chat in real time. Built with plain
HTML/CSS/JS + Node.js/Socket.io, wrapped into a **native Android APK**
using Capacitor, and auto-built/published via GitHub Actions so anyone
can download the APK from your repo's Releases page.

## How it works

- `server/` — a small Node.js + Socket.io server. It holds one "waiting"
  socket per 4-digit code. When a second person joins with the same
  code, both are placed in a private room and messages are relayed
  between them only.
- `www/` — the actual app UI (HTML/CSS/JS). This is what gets bundled
  into the APK. It connects to your server over WebSocket.
- Capacitor wraps `www/` into a real native Android app (a WebView
  shell with native packaging, permissions, and an installable APK) —
  not just a browser bookmark.
- `.github/workflows/build-apk.yml` — builds the APK on every push to
  `main` and attaches it to a new GitHub Release automatically.

## 1. Deploy the server

The APK is just the front end — it needs a real server to talk to,
since GitHub can't host a live WebSocket server for you. Deploy
`server/` to any Node host, for example:

- Render.com (free tier, easiest)
- Railway.app
- Fly.io
- Your own VPS

Steps for Render (example):
1. Push this repo to GitHub.
2. On Render: New → Web Service → connect the repo → set root
   directory to `server` → build command `npm install` → start
   command `npm start`.
3. Once deployed, copy the public URL, e.g. `https://pairchat-server.onrender.com`.

## 2. Point the app at your server

Edit `www/app.js` and set:

```js
const SERVER_URL = "https://pairchat-server.onrender.com";
```

Commit and push this change.

## 3. Build the APK

**Option A — let GitHub build it for you (recommended):**
Just push to `main`. The included workflow will:
1. Install dependencies
2. Add the Android platform via Capacitor
3. Build a debug APK
4. Publish it as a file on a new GitHub Release

Anyone can then go to your repo's **Releases** tab and download
`pairchat.apk` directly.

**Option B — build locally:**
```bash
npm install
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
# APK will be at android/app/build/outputs/apk/debug/app-debug.apk
```
(Requires Node.js, a JDK, and the Android SDK installed locally.)

## 4. Installing on a phone

1. Go to the repo's **Releases** page on GitHub.
2. Download `pairchat.apk` to the phone.
3. Open the file — Android will prompt to allow "install from
   unknown sources" the first time. Approve it, then install.
4. Open the app, both people enter the **same 4-digit code**, and
   they're connected.

## Notes / next steps

- This debug build is unsigned for simplicity. For a production
  release, sign the APK with your own keystore (`assembleRelease` +
  a signing config in `android/app/build.gradle`) before wide
  distribution.
- Rooms are ephemeral and in-memory only — restarting the server
  clears all pairings. For persistence, swap in Redis or a database.
- Add HTTPS/WSS (most hosts like Render give you this by default) so
  traffic isn't sent in plaintext.
