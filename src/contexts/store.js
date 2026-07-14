import { create } from 'zustand';

// ─── Accent palettes ──────────────────────────────────────────────────────────
const ACCENTS = {
  violet: { accent: '#7c6dfa', accentHover: '#9485fb', accentDim: 'rgba(124,109,250,0.18)', accentGlow: 'rgba(124,109,250,0.35)' },
  cyan:   { accent: '#00d2ff', accentHover: '#33dbff', accentDim: 'rgba(0,210,255,0.15)',   accentGlow: 'rgba(0,210,255,0.3)'   },
  green:  { accent: '#3dd68c', accentHover: '#5fdf9f', accentDim: 'rgba(61,214,140,0.15)',  accentGlow: 'rgba(61,214,140,0.3)'  },
  rose:   { accent: '#f04d87', accentHover: '#f572a0', accentDim: 'rgba(240,77,135,0.15)',  accentGlow: 'rgba(240,77,135,0.3)'  },
  amber:  { accent: '#f5a623', accentHover: '#f7bb57', accentDim: 'rgba(245,166,35,0.15)',  accentGlow: 'rgba(245,166,35,0.3)'  },
  orange: { accent: '#FF6700', accentHover: '#E05B00', accentDim: 'rgba(255,103,0,0.15)',  accentGlow: 'rgba(255,103,0,0.3)'   },
};

// ─── Color mode palettes ──────────────────────────────────────────────────────
const COLOR_MODES = {
  xiaomi: {
    '--c-bg-base':     '#F9F6F3',
    '--c-bg-raised':   '#EBE5DC',
    '--c-bg-elevated': '#F3EEE8',
    '--c-bg-overlay':  '#E3DDD3',
    '--c-bg-hover':    'rgba(207, 199, 186, 0.4)',
    '--c-border':      '#DFD8CD',
    '--c-border-hover':'#CFC7BA',
    '--c-border-focus':'#FF6700',
    '--c-text-primary':'#1D0601',
    '--c-text-secondary':'rgba(29, 6, 1, 0.7)',
    '--c-text-muted':  '#8E8880',
    '--c-green':       '#1ea860',
    '--c-green-dim':   'rgba(30,168,96,0.12)',
    '--c-red':         '#d63030',
    '--c-red-dim':     'rgba(214,48,48,0.12)',
    '--c-yellow':      '#c88a00',
    '--c-yellow-dim':  'rgba(200,138,0,0.12)',
    '--c-blue':        '#2266cc',
  },
  dark: {
    '--c-bg-base':     '#0e0f14',
    '--c-bg-raised':   '#13141b',
    '--c-bg-elevated': '#1a1b24',
    '--c-bg-overlay':  '#21222e',
    '--c-bg-hover':    '#22243080',
    '--c-border':      '#2a2c3a',
    '--c-border-hover':'#3d3f52',
    '--c-border-focus':'#5a5d7a',
    '--c-text-primary':'#e8e9f0',
    '--c-text-secondary':'#9496b0',
    '--c-text-muted':  '#5c5f7a',
    '--c-green':       '#3dd68c',
    '--c-green-dim':   'rgba(61,214,140,0.12)',
    '--c-red':         '#f04d4d',
    '--c-red-dim':     'rgba(240,77,77,0.12)',
    '--c-yellow':      '#f5c842',
    '--c-yellow-dim':  'rgba(245,200,66,0.12)',
    '--c-blue':        '#4d9ef0',
  },
  light: {
    '--c-bg-base':     '#f0f1f6',
    '--c-bg-raised':   '#ffffff',
    '--c-bg-elevated': '#e8eaf2',
    '--c-bg-overlay':  '#dde0ec',
    '--c-bg-hover':    '#d5d8ea80',
    '--c-border':      '#d0d3e4',
    '--c-border-hover':'#b0b4cc',
    '--c-border-focus':'#8890b8',
    '--c-text-primary':'#1a1b2e',
    '--c-text-secondary':'#4a4e6e',
    '--c-text-muted':  '#8890b8',
    '--c-green':       '#1ea860',
    '--c-green-dim':   'rgba(30,168,96,0.12)',
    '--c-red':         '#d63030',
    '--c-red-dim':     'rgba(214,48,48,0.12)',
    '--c-yellow':      '#c88a00',
    '--c-yellow-dim':  'rgba(200,138,0,0.12)',
    '--c-blue':        '#2266cc',
  },
  oled: {
    '--c-bg-base':     '#000000',
    '--c-bg-raised':   '#080808',
    '--c-bg-elevated': '#101010',
    '--c-bg-overlay':  '#181818',
    '--c-bg-hover':    '#20202080',
    '--c-border':      '#1e1e1e',
    '--c-border-hover':'#2e2e2e',
    '--c-border-focus':'#4a4a4a',
    '--c-text-primary':'#ffffff',
    '--c-text-secondary':'#888888',
    '--c-text-muted':  '#444444',
    '--c-green':       '#00ff88',
    '--c-green-dim':   'rgba(0,255,136,0.1)',
    '--c-red':         '#ff4444',
    '--c-red-dim':     'rgba(255,68,68,0.1)',
    '--c-yellow':      '#ffcc00',
    '--c-yellow-dim':  'rgba(255,204,0,0.1)',
    '--c-blue':        '#4488ff',
  },
  frosted: {
    '--c-bg-base':     '#12131a',
    '--c-bg-raised':   'rgba(255,255,255,0.05)',
    '--c-bg-elevated': 'rgba(255,255,255,0.08)',
    '--c-bg-overlay':  'rgba(255,255,255,0.11)',
    '--c-bg-hover':    'rgba(255,255,255,0.07)',
    '--c-border':      'rgba(255,255,255,0.09)',
    '--c-border-hover':'rgba(255,255,255,0.18)',
    '--c-border-focus':'rgba(255,255,255,0.35)',
    '--c-text-primary':'rgba(255,255,255,0.95)',
    '--c-text-secondary':'rgba(255,255,255,0.55)',
    '--c-text-muted':  'rgba(255,255,255,0.28)',
    '--c-green':       '#3dd68c',
    '--c-green-dim':   'rgba(61,214,140,0.14)',
    '--c-red':         '#f06060',
    '--c-red-dim':     'rgba(240,96,96,0.14)',
    '--c-yellow':      '#f5c842',
    '--c-yellow-dim':  'rgba(245,200,66,0.14)',
    '--c-blue':        '#5ba8f0',
  },
  midnight: {
    '--c-bg-base':     '#0a0c18',
    '--c-bg-raised':   '#0f1120',
    '--c-bg-elevated': '#151826',
    '--c-bg-overlay':  '#1b1f30',
    '--c-bg-hover':    '#22263a80',
    '--c-border':      '#252840',
    '--c-border-hover':'#363a58',
    '--c-border-focus':'#4e5280',
    '--c-text-primary':'#d0d4f0',
    '--c-text-secondary':'#7880b0',
    '--c-text-muted':  '#454870',
    '--c-green':       '#4de8a0',
    '--c-green-dim':   'rgba(77,232,160,0.12)',
    '--c-red':         '#f06080',
    '--c-red-dim':     'rgba(240,96,128,0.12)',
    '--c-yellow':      '#f0c060',
    '--c-yellow-dim':  'rgba(240,192,96,0.12)',
    '--c-blue':        '#60a0f0',
  },
};

// ─── Radius presets ────────────────────────────────────────────────────────────
const RADIUS_PRESETS = {
  rounded: { '--r-sm': '6px', '--r-md': '10px', '--r-lg': '14px', '--r-xl': '20px', '--r-pill': '9999px' },
  sharp:   { '--r-sm': '2px', '--r-md': '4px',  '--r-lg': '6px',  '--r-xl': '10px', '--r-pill': '6px'    },
  soft:    { '--r-sm': '8px', '--r-md': '14px', '--r-lg': '20px', '--r-xl': '28px', '--r-pill': '9999px' },
};

// ─── Font presets ──────────────────────────────────────────────────────────────
const FONT_PRESETS = {
  mono:    { '--font-ui': '"JetBrains Mono", "Fira Code", monospace', '--font-size-base': '13px' },
  sans:    { '--font-ui': '"Inter", "Segoe UI", system-ui, sans-serif', '--font-size-base': '14px' },
  rounded: { '--font-ui': '"Nunito", "Varela Round", system-ui, sans-serif', '--font-size-base': '14px' },
};

function applyTheme({ colorMode, accent, radius, font }) {
  const root = document.documentElement;
  const mode = COLOR_MODES[colorMode] || COLOR_MODES.dark;
  const acc  = ACCENTS[accent] || ACCENTS.violet;
  const rad  = RADIUS_PRESETS[radius] || RADIUS_PRESETS.rounded;
  const fnt  = FONT_PRESETS[font] || FONT_PRESETS.mono;

  Object.entries(mode).forEach(([k, v]) => root.style.setProperty(k, v));
  root.style.setProperty('--c-accent',       acc.accent);
  root.style.setProperty('--c-accent-hover', acc.accentHover);
  root.style.setProperty('--c-accent-dim',   acc.accentDim);
  root.style.setProperty('--c-accent-glow',  acc.accentGlow);
  Object.entries(rad).forEach(([k, v]) => root.style.setProperty(k, v));
  Object.entries(fnt).forEach(([k, v]) => root.style.setProperty(k, v));

  // Frosted glass backdrop on raised surfaces
  root.style.setProperty('--backdrop', colorMode === 'frosted' ? 'blur(12px)' : 'none');

  // Light mode: flip the globals.css body background too
  root.setAttribute('data-color-mode', colorMode);
}

export const useAppStore = create((set, get) => ({
  // ── Navigation ──────────────────────────────────────────────────────────────
  currentView: 'home',
  currentChannel: null,
  currentChannelName: 'general',
  setView: (view) => set({ currentView: view }),
  setChannel: (id, name) => set({ currentChannel: id, currentChannelName: name }),

  // ── Theme system ─────────────────────────────────────────────────────────────
  colorMode: 'xiaomi',       // xiaomi | dark | light | oled | frosted | midnight
  accent: 'orange',        // orange | violet | cyan | green | rose | amber
  radius: 'rounded',       // rounded | sharp | soft
  font: 'sans',            // mono | sans | rounded
  colorModes: Object.keys(COLOR_MODES),
  accents: Object.keys(ACCENTS),
  radiusPresets: Object.keys(RADIUS_PRESETS),
  fontPresets: Object.keys(FONT_PRESETS),

  setColorMode: (colorMode) => {
    const s = get();
    set({ colorMode });
    applyTheme({ colorMode, accent: s.accent, radius: s.radius, font: s.font });
  },
  setAccent: (accent) => {
    const s = get();
    set({ accent });
    applyTheme({ colorMode: s.colorMode, accent, radius: s.radius, font: s.font });
  },
  setRadius: (radius) => {
    const s = get();
    set({ radius });
    applyTheme({ colorMode: s.colorMode, accent: s.accent, radius, font: s.font });
  },
  setFont: (font) => {
    const s = get();
    set({ font });
    applyTheme({ colorMode: s.colorMode, accent: s.accent, radius: s.radius, font });
  },

  // Legacy compat — maps old setTheme(accentName) calls to new setAccent
  theme: 'violet',
  themes: ACCENTS,
  setTheme: (name) => {
    set({ theme: name, accent: name });
    const s = get();
    applyTheme({ colorMode: s.colorMode, accent: name, radius: s.radius, font: s.font });
  },

  initTheme: () => {
    const s = get();
    applyTheme({ colorMode: s.colorMode, accent: s.accent, radius: s.radius, font: s.font });
  },

  // ── Video background ─────────────────────────────────────────────────────────
  videoBackground: 'none',
  setVideoBackground: (bg) => set({ videoBackground: bg }),

  // ── Sidebar ──────────────────────────────────────────────────────────────────
  sidebarOpen: true,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  // ── Channels ─────────────────────────────────────────────────────────────────
  channels: [
    { id: 'general',       name: 'general',       type: 'voice', members: 0 },
    { id: 'gaming',        name: 'gaming',        type: 'voice', members: 0 },
    { id: 'study-room',    name: 'study room',    type: 'voice', members: 0 },
    { id: 'chill-beats',   name: 'chill beats',   type: 'voice', members: 0 },
    { id: 'movie-party',   name: 'movie room',    type: 'voice', members: 0 },
    { id: 'general-chat',  name: 'general-chat',  type: 'text',  members: 0 },
    { id: 'announcements', name: 'announcements', type: 'text',  members: 0 },
  ],

  channelUsers: [],

  // ── Text channel messages ──────────────────────────────────────────────────────
  messages: (() => {
    try {
      const saved = localStorage.getItem('juno_messages');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    
    // Default initial mock messages
    return {
      'general-chat': [
        { id: 'init-1', channelId: 'general-chat', author: 'System', text: 'Welcome to the #general-chat channel! 🚀 Feel free to say hi.', timestamp: Date.now() - 3600000 * 2, edited: false },
        { id: 'init-2', channelId: 'general-chat', author: 'Alex', text: 'Hey everyone, glad we finally have a general text chat here! 🎉', timestamp: Date.now() - 3600000, edited: false },
      ],
      'announcements': [
        { id: 'init-3', channelId: 'announcements', author: 'Admin', text: 'Welcome to the Announcements channel. Important updates will be posted here.', timestamp: Date.now() - 3600000 * 24, edited: false },
      ]
    };
  })(),
  sendMessage: (channelId, text) => {
    const id = Date.now() + Math.random();
    const author = get().user.name;
    set(s => {
      const nextMessages = {
        ...s.messages,
        [channelId]: [...(s.messages[channelId] || []), { id, channelId, author, text, timestamp: Date.now(), edited: false }],
      };
      try {
        localStorage.setItem('juno_messages', JSON.stringify(nextMessages));
      } catch (e) {}
      return { messages: nextMessages };
    });
  },
  deleteMessage: (channelId, msgId) => {
    set(s => {
      const nextMessages = {
        ...s.messages,
        [channelId]: (s.messages[channelId] || []).filter(m => m.id !== msgId),
      };
      try {
        localStorage.setItem('juno_messages', JSON.stringify(nextMessages));
      } catch (e) {}
      return { messages: nextMessages };
    });
  },
  editMessage: (channelId, msgId, newText) => {
    set(s => {
      const nextMessages = {
        ...s.messages,
        [channelId]: (s.messages[channelId] || []).map(m => m.id === msgId ? { ...m, text: newText, edited: true } : m),
      };
      try {
        localStorage.setItem('juno_messages', JSON.stringify(nextMessages));
      } catch (e) {}
      return { messages: nextMessages };
    });
  },

  // ── Grid customization ─────────────────────────────────────────────────────────
  gridColumns: 'auto',
  setGridColumns: (n) => set({ gridColumns: n }),
  focusedUser: null,
  setFocusedUser: (uid) => set({ focusedUser: uid }),
  clearFocus: () => set({ focusedUser: null }),
  tileOrder: [],
  setTileOrder: (order) => set({ tileOrder: order }),
  swapTiles: (fromIdx, toIdx) => {
    set(s => {
      const order = [...(s.tileOrder.length ? s.tileOrder : [])];
      if (!order.length) return {};
      const temp = order[fromIdx];
      order[fromIdx] = order[toIdx];
      order[toIdx] = temp;
      return { tileOrder: order };
    });
  },

  // ── Popout ─────────────────────────────────────────────────────────────────────
  popoutActive: false,
  setPopoutActive: (v) => set({ popoutActive: v }),

  // ── Wordle Game ────────────────────────────────────────────────────────────────
  gameActive: false,
  gameWord: '',
  gameGuesses: [],
  gameStatus: 'idle', // idle | playing | won | lost
  gamePlayers: [],     // { name, joined }
  gameMaxGuesses: 6,

  startGame: () => {
    const words = [
      'crane', 'slate', 'trace', 'crate', 'arise', 'raise', 'stare', 'later',
      'alert', 'alter', 'heart', 'earth', 'ocean', 'flame', 'bloom', 'ghost',
      'charm', 'brave', 'grape', 'shard', 'tiger', 'piano', 'melon', 'cider',
      'drift', 'plumb', 'globe', 'frost', 'noble', 'spark', 'lunar', 'realm',
      'quest', 'glyph', 'prism', 'vivid', 'blitz', 'crux', 'flint', 'nexus',
    ];
    const word = words[Math.floor(Math.random() * words.length)];
    set({
      gameActive: true,
      gameWord: word,
      gameGuesses: [],
      gameStatus: 'playing',
      gamePlayers: [{ name: get().user.name, joined: true }],
    });
  },

  joinGame: () => {
    const name = get().user.name;
    set(s => {
      if (s.gamePlayers.find(p => p.name === name)) return {};
      return { gamePlayers: [...s.gamePlayers, { name, joined: true }] };
    });
  },

  submitGuess: (guess) => {
    const state = get();
    if (state.gameStatus !== 'playing') return;
    if (state.gameGuesses.length >= state.gameMaxGuesses) return;

    const word = state.gameWord.toLowerCase();
    const g = guess.toLowerCase();

    // Build the result: correct | present | absent for each letter
    const result = [];
    const wordArr = word.split('');
    const guessArr = g.split('');
    const used = new Array(5).fill(false);

    // First pass: exact matches (green)
    for (let i = 0; i < 5; i++) {
      if (guessArr[i] === wordArr[i]) {
        result[i] = 'correct';
        used[i] = true;
      }
    }

    // Second pass: present (yellow) or absent (gray)
    for (let i = 0; i < 5; i++) {
      if (result[i]) continue;
      const idx = wordArr.findIndex((ch, j) => ch === guessArr[i] && !used[j]);
      if (idx !== -1) {
        result[i] = 'present';
        used[idx] = true;
      } else {
        result[i] = 'absent';
      }
    }

    const newGuesses = [...state.gameGuesses, { word: g, result }];
    const won = g === word;
    const lost = !won && newGuesses.length >= state.gameMaxGuesses;

    set({
      gameGuesses: newGuesses,
      gameStatus: won ? 'won' : lost ? 'lost' : 'playing',
    });
  },

  endGame: () => {
    set({
      gameActive: false,
      gameWord: '',
      gameGuesses: [],
      gameStatus: 'idle',
      gamePlayers: [],
    });
  },

  // ── Settings ─────────────────────────────────────────────────────────────────
  settingsOpen: false,
  settingsTab: 'audio',
  openSettings: (tab = 'audio') => set({ settingsOpen: true, settingsTab: tab }),
  closeSettings: () => set({ settingsOpen: false }),
  setSettingsTab: (tab) => set({ settingsTab: tab }),

  // ── Notifications ─────────────────────────────────────────────────────────────
  notifications: [],
  addNotification: (msg) => {
    const id = Date.now();
    set(s => ({ notifications: [...s.notifications, { id, msg }] }));
    setTimeout(() => set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })), 3500);
  },

  // ── User profile ──────────────────────────────────────────────────────────────
  user: { name: 'You', avatar: 'Y', status: 'online' },
  setUserStatus: (status) => set(s => ({ user: { ...s.user, status } })),
}));