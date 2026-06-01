# Wavelength — VOIP App

A Discord-style voice/video calling app built with **React + Agora RTC SDK**.

## Features

- 🎙 Voice calling with noise suppression & echo cancellation
- 📹 HD video calling (up to 1080p)
- 🖥 Screen sharing (full screen or specific window)
- 🎨 5 color themes (Violet, Cyan, Green, Rose, Amber)
- 🌅 Virtual video backgrounds (blur, office, café, space, beach)
- 🔊 Per-device audio controls (mic, speaker, volume sliders)
- 📶 Real-time network quality indicator
- 👥 Channel-based server layout (Discord-style)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Agora

1. Create a free account at [console.agora.io](https://console.agora.io)
2. Create a new project
3. Copy your **App ID**
4. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

5. Paste your App ID:

```
VITE_AGORA_APP_ID=your_app_id_here
```

> **Note**: For development, disable token authentication in Agora Console (set to "Testing mode"). For production, implement a token server.

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Architecture

```
src/
├── components/
│   ├── Sidebar.jsx      # Server/channel list + user bar
│   ├── HomeView.jsx     # Landing page with channel picker
│   ├── CallView.jsx     # Active call with video grid
│   ├── Settings.jsx     # Audio/video/theme/background settings
│   └── Notifications.jsx
├── hooks/
│   └── useAgora.js      # All Agora RTC logic (join/leave/media)
├── contexts/
│   └── store.js         # Zustand global state
└── styles/
    └── globals.css      # Design system + utility classes
```

## Connecting to your existing Agora implementation

The `useAgora` hook in `src/hooks/useAgora.js` is the integration point. If you have an existing Agora setup:

1. Replace the hook's internals with your existing client logic
2. Keep the same returned interface so components work unchanged
3. Pass your existing `AgoraRTCClient` instance into `clientRef.current`

## Customizing channels

Edit `channels` in `src/contexts/store.js` to change the list of voice/text channels. In production, fetch these from your backend API.

## Token server (production)

For production, generate tokens server-side. Update `join()` in `useAgora.js`:

```js
const res = await fetch(`/api/agora-token?channel=${channel}&uid=${uid}`);
const { token } = await res.json();
await client.join(APP_ID, channel, token, uid);
```

## Build for production

```bash
npm run build
```

Output goes to `dist/`. Deploy to Vercel, Netlify, or any static host.
