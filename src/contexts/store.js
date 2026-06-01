import { create } from 'zustand';

const THEMES = {
  violet: { accent: '#7c6dfa', accentHover: '#9485fb', accentDim: 'rgba(124,109,250,0.18)', accentGlow: 'rgba(124,109,250,0.35)' },
  cyan:   { accent: '#00d2ff', accentHover: '#33dbff', accentDim: 'rgba(0,210,255,0.15)',   accentGlow: 'rgba(0,210,255,0.3)'   },
  green:  { accent: '#3dd68c', accentHover: '#5fdf9f', accentDim: 'rgba(61,214,140,0.15)',  accentGlow: 'rgba(61,214,140,0.3)'  },
  rose:   { accent: '#f04d87', accentHover: '#f572a0', accentDim: 'rgba(240,77,135,0.15)',  accentGlow: 'rgba(240,77,135,0.3)'  },
  amber:  { accent: '#f5a623', accentHover: '#f7bb57', accentDim: 'rgba(245,166,35,0.15)',  accentGlow: 'rgba(245,166,35,0.3)'  },
};

export const useAppStore = create((set, get) => ({
  // Navigation
  currentView: 'home',      // home | call | settings
  currentChannel: null,
  currentChannelName: 'general',
  setView: (view) => set({ currentView: view }),
  setChannel: (id, name) => set({ currentChannel: id, currentChannelName: name }),

  // Theme
  theme: 'violet',
  themes: THEMES,
  setTheme: (name) => {
    set({ theme: name });
    const t = THEMES[name];
    if (t) {
      const root = document.documentElement;
      root.style.setProperty('--c-accent', t.accent);
      root.style.setProperty('--c-accent-hover', t.accentHover);
      root.style.setProperty('--c-accent-dim', t.accentDim);
      root.style.setProperty('--c-accent-glow', t.accentGlow);
    }
  },

  // Video background
  videoBackground: 'none',  // none | blur | office | cafe | space | beach
  setVideoBackground: (bg) => set({ videoBackground: bg }),

  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  // Channels
  channels: [
    { id: 'general', name: 'general', type: 'voice', members: 3 },
    { id: 'gaming', name: 'gaming', type: 'voice', members: 7 },
    { id: 'study-room', name: 'study room', type: 'voice', members: 2 },
    { id: 'chill-beats', name: 'chill beats', type: 'voice', members: 0 },
    { id: 'announcements', name: 'announcements', type: 'text', members: 0 },
  ],

  // Mock users in channel
  channelUsers: [
    { uid: 'alice',   name: 'Alice K.',   avatar: 'A', speaking: false, muted: false, hasVideo: false, color: '#7c6dfa' },
    { uid: 'bob',     name: 'Bob T.',     avatar: 'B', speaking: true,  muted: false, hasVideo: true,  color: '#3dd68c' },
    { uid: 'carla',   name: 'Carla M.',   avatar: 'C', speaking: false, muted: true,  hasVideo: false, color: '#f04d87' },
  ],

  // Settings panel open
  settingsOpen: false,
  settingsTab: 'audio',
  openSettings: (tab = 'audio') => set({ settingsOpen: true, settingsTab: tab }),
  closeSettings: () => set({ settingsOpen: false }),
  setSettingsTab: (tab) => set({ settingsTab: tab }),

  // Notifications
  notifications: [],
  addNotification: (msg) => {
    const id = Date.now();
    set(s => ({ notifications: [...s.notifications, { id, msg }] }));
    setTimeout(() => set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })), 3500);
  },

  // User profile
  user: { name: 'You', avatar: 'Y', status: 'online' },
  setUserStatus: (status) => set(s => ({ user: { ...s.user, status } })),
}));
