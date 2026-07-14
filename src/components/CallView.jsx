import { useEffect, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Settings, Maximize, Minimize, Grid2X2,
  Focus, ExternalLink, Gamepad2, Play, Volume2, VolumeX,
  Shuffle, SkipBack, SkipForward, Repeat, Trash2, Plus, ListMusic, Volume1
} from 'lucide-react';
import { useAppStore } from '../contexts/store';
import { WordleGame } from './WordleGame';
import { ChessGame } from './ChessGame';
import { CrosswordGame } from './CrosswordGame';
import './CallView.css';

// Screen share UIDs are offset from their owner's main UID by this amount.
// Must match SCREEN_UID_OFFSET in useAgora.js.
const SCREEN_UID_OFFSET = 100000;

// ─── Network quality indicator ─────────────────────────────────────────────────
function NetQuality({ quality }) {
  if (!quality) return null;
  const up = quality.uplinkNetworkQuality;
  const bars = up <= 1 ? 4 : up <= 2 ? 3 : up <= 3 ? 2 : 1;
  const color = bars >= 3 ? 'var(--c-green)' : bars === 2 ? 'var(--c-yellow)' : 'var(--c-red)';
  return (
    <div className="net-quality" title={`Network quality: ${bars}/4`}>
      {[1, 2, 3, 4].map(i => (
        <span key={i} className="net-bar"
          style={{ opacity: i <= bars ? 1 : 0.2, background: color, height: `${i * 4 + 4}px` }} />
      ))}
    </div>
  );
}

// ─── Tile colors ───────────────────────────────────────────────────────────────
const TILE_COLORS = ['#3dd68c', '#00d2ff', '#f04d87', '#f5a623', '#7c6dfa', '#4d9ef0'];
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return h;
}

// ─── Video tile with resize handle ─────────────────────────────────────────────
function VideoTile({ uid, type, agora, user, flexGrow, onResizeStart, onDoubleClick, isFocused, isStrip, isStreamJoined, onJoinStream, onStreamVolumeChange, popoutActive, minimalStudyMode }) {
  const videoRef = useRef(null);
  const [streamVolume, setStreamVolume] = useState(100);

  const isLocal = type === 'local';
  const isRemoteScreenShare = type === 'remote' && !!user?.isScreenShare;
  const baseUid = isRemoteScreenShare ? Number(uid) - SCREEN_UID_OFFSET : uid;

  // Resolve target lookup key maps cleanly
  const currentKey = isLocal ? String(agora.localUid || '__local__') : String(uid);
  
  // Extract specific active text string matched to this tile card instance
  const currentSubtitleText = agora.subtitles?.[currentKey] || "";

  console.log('VideoTile checking key:', currentKey, 'subtitles object:', agora.subtitles);

  const color = isLocal
    ? '#7c6dfa'
    : TILE_COLORS[Math.abs(hashCode(String(baseUid))) % TILE_COLORS.length];

  const label = isLocal ? 'Y' : String(baseUid).slice(0, 2).toUpperCase();
  const name = isLocal ? 'You' : (isRemoteScreenShare ? `User ${String(baseUid).slice(0, 6)}'s Screen` : `User ${String(uid).slice(0, 6)}`);

  const hasVideo = isLocal ? agora.cameraEnabled : user?.hasVideo;
  const isMuted = isLocal ? !agora.micEnabled : !user?.hasAudio;
  const isStreamActive = isRemoteScreenShare && hasVideo;

  useEffect(() => {
    if (isRemoteScreenShare && user?.audioTrack) {
      user.audioTrack.setVolume(isStreamJoined ? streamVolume : 0);
    }
  }, [isRemoteScreenShare, isStreamJoined, user?.audioTrack, streamVolume]);

  const handleVolumeChange = useCallback((e) => {
    const vol = Number(e.target.value);
    setStreamVolume(vol);
    if (user?.audioTrack) {
      user.audioTrack.setVolume(isStreamJoined ? vol : 0);
    }
  }, [user?.audioTrack, isStreamJoined]);

  const localVideoTrack = agora.localVideoTrack?.current;
  const remoteVideoTrack = user?.videoTrack;

  useEffect(() => {
    if (!hasVideo || !videoRef.current) return;
    if (isRemoteScreenShare && !isStreamJoined) return;
    if (popoutActive) {
      if (isLocal) {
        try { localVideoTrack?.stop?.(); } catch {}
      } else {
        try { remoteVideoTrack?.stop?.(); } catch {}
      }
      return;
    }

    if (isLocal) {
      let attempts = 0;
      let timeoutId = null;
      let isMounted = true;
      const tryPlay = () => {
        if (!isMounted) return;
        if (localVideoTrack && videoRef.current) {
          try { localVideoTrack.play(videoRef.current); } catch {}
          return;
        }
        if (attempts++ < 30) timeoutId = setTimeout(tryPlay, 100);
      };
      tryPlay();
      return () => { 
        isMounted = false; 
        if (timeoutId) clearTimeout(timeoutId); 
        try { localVideoTrack?.stop?.(); } catch {}
      };
    } else {
      if (remoteVideoTrack && videoRef.current) {
        try { remoteVideoTrack.play(videoRef.current); } catch {}
      }
      return () => { try { remoteVideoTrack?.stop?.(); } catch {} };
    }
  }, [hasVideo, isLocal, localVideoTrack, remoteVideoTrack, isRemoteScreenShare, isStreamJoined, popoutActive]);

  if (minimalStudyMode) {
    return (
      <div 
        className="video-tile minimal-study-tile relative" 
        style={{ width: '100%', height: '100%', borderRadius: 'inherit', overflow: 'hidden', background: '#000' }}
      >
        <video
          ref={videoRef}
          className="video-el"
          autoPlay
          muted={isLocal}
          playsInline
          style={{ display: hasVideo ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
        />
        {!hasVideo && (
          <div className="video-avatar-minimal flex items-center justify-center h-full text-zinc-500 font-mono text-[10px]" style={{ background: '#141c16' }}>
            {isLocal ? 'YOU' : 'OFF'}
          </div>
        )}
      </div>
    );
  }

  const tileStyle = isStrip ? {} : { flex: flexGrow, minWidth: 0 };

  return (
    <div
      className={`video-tile relative ${isFocused ? 'focused' : ''} ${isStrip ? 'strip-tile' : ''} ${isRemoteScreenShare ? 'is-screen-share' : ''}`}
      style={tileStyle}
      onDoubleClick={onDoubleClick}
    >
      <video
        ref={videoRef}
        className="video-el"
        autoPlay
        muted={isLocal}
        playsInline
        style={{ display: hasVideo && (!isRemoteScreenShare || isStreamJoined) && !popoutActive ? 'block' : 'none' }}
      />

      {/* 👇 Subtitle overlay anchored inside the tile */}
      {currentSubtitleText && currentSubtitleText.trim().length > 0 && (
        <div 
          className="tile-subtitle"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
        >
          {currentSubtitleText}
        </div>
      )}

      {isStreamActive && !isStreamJoined && (
        <div className="stream-unjoined-overlay">
          <Monitor size={40} color="var(--c-accent)" />
          <p className="stream-title">{name}</p>
          <button
            className="join-stream-btn"
            onClick={(e) => {
              e.stopPropagation();
              onJoinStream(uid);
            }}
          >
            <Play size={16} fill="currentColor" />
            Join Stream
          </button>
        </div>
      )}

      {isStreamActive && isStreamJoined && (
        <div className="stream-volume-control" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
          {streamVolume > 0 ? <Volume2 size={14} /> : <VolumeX size={14} />}
          <input type="range" min={0} max={100} value={streamVolume} onChange={handleVolumeChange} className="stream-volume-slider" title={`Stream volume: ${streamVolume}%`} />
        </div>
      )}

      {(!hasVideo || popoutActive) && (!isRemoteScreenShare || isStreamJoined) && (
        <div className="video-avatar">
          <div className="avatar-circle" style={{ background: color + '22', color }}>{label}</div>
          <p className="avatar-name">{name}</p>
        </div>
      )}

      <div className="tile-overlay" onDoubleClick={onDoubleClick}>
        <div className="tile-info">
          <span className="tile-name">{name}</span>
          {isMuted && !isRemoteScreenShare && <span className="tile-muted"><MicOff size={12} /></span>}
        </div>
      </div>

      {!isStrip && (
        <div className="tile-resize-handle" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onResizeStart(uid, e.clientX, flexGrow); }} title="Drag to resize">
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
            <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}

function TheaterSeat({ color = "#991b1b" }) {
  return (
    <svg viewBox="0 0 100 100" className="theater-seat-svg" width="30" height="30" style={{ pointerEvents: 'none' }}>
      {/* Backrest cushion */}
      <rect x="25" y="15" width="50" height="42" rx="8" fill={color} stroke="#1e0505" strokeWidth="2.5" />
      {/* Backrest pleat lining */}
      <line x1="50" y1="18" x2="50" y2="52" stroke="rgba(0,0,0,0.15)" strokeWidth="2" />
      {/* Left armrest */}
      <rect x="14" y="42" width="10" height="26" rx="4" fill="#1c1c1f" stroke="#000" strokeWidth="1.5" />
      {/* Right armrest */}
      <rect x="76" y="42" width="10" height="26" rx="4" fill="#1c1c1f" stroke="#000" strokeWidth="1.5" />
      {/* Seat cushion */}
      <rect x="20" y="48" width="60" height="24" rx="6" fill={color} stroke="#1e0505" strokeWidth="2.5" />
      {/* Cushion pleat lining */}
      <line x1="24" y1="60" x2="76" y2="60" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      {/* Seat pedestal legs */}
      <line x1="36" y1="72" x2="36" y2="92" stroke="#111" strokeWidth="4.5" />
      <line x1="64" y1="72" x2="64" y2="92" stroke="#111" strokeWidth="4.5" />
      {/* Seat floor base */}
      <rect x="25" y="90" width="50" height="4.5" rx="1.5" fill="#16161a" />
    </svg>
  );
}

// ─── Screen share tile ─────────────────────────────────────────────────────────
function ScreenTile({ getLocalScreenTrack }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('binding');

  useEffect(() => {
    let attempts = 0;
    let timeoutId = null;
    let isMounted = true;
    const videoEl = videoRef.current;

    const tryBind = () => {
      if (!isMounted || !videoEl) return;
      const agoraTrack = typeof getLocalScreenTrack === 'function' ? getLocalScreenTrack() : null;
      if (!agoraTrack) {
        if (attempts++ < 40) timeoutId = setTimeout(tryBind, 100);
        return;
      }
      const rawTrack = agoraTrack.getMediaStreamTrack?.();
      if (!rawTrack) {
        if (attempts++ < 40) timeoutId = setTimeout(tryBind, 100);
        return;
      }
      videoEl.srcObject = new MediaStream([rawTrack]);
      videoEl.play()
        .then(() => { if (isMounted) setStatus('playing'); })
        .catch(e => { console.warn('Screen video play blocked:', e); if (isMounted) setStatus('error'); });
    };

    tryBind();
    return () => { isMounted = false; if (timeoutId) clearTimeout(timeoutId); if (videoEl) videoEl.srcObject = null; };
  }, []);

  return (
    <div className="screen-tile">
      <video ref={videoRef} className="screen-video-el" autoPlay muted playsInline
        style={{ display: status === 'playing' ? 'block' : 'none' }} />
      {status !== 'playing' && (
        <div className="video-avatar">
          <p className="avatar-name" style={{ fontSize: 13 }}>
            {status === 'error' ? 'Screen share failed' : 'Starting screen share…'}
          </p>
        </div>
      )}
      <div className="screen-badge">
        <Monitor size={13} aria-hidden />
        Screen share
      </div>
    </div>
  );
}

// ─── Grid size picker ──────────────────────────────────────────────────────────
function GridSizePicker({ value, onChange }) {
  const options = [
    { val: 'auto', label: 'Auto', icon: Grid2X2 },
    { val: 1, label: '1' },
    { val: 2, label: '2' },
    { val: 3, label: '3' },
  ];
  return (
    <div className="grid-size-picker">
      {options.map(opt => (
        <button
          key={opt.val}
          className={`grid-size-btn ${value === opt.val ? 'active' : ''}`}
          onClick={() => onChange(opt.val)}
          title={`Grid: ${opt.label}`}
        >
          {opt.icon ? <opt.icon size={14} /> : opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Popout renderer (runs inside the PiP window) ──────────────────────────────
function PopoutContent({ agora }) {
  const { currentChannelName, user } = useAppStore();
  const remoteUsers = agora.remoteUsers;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      height: '100%', padding: 8, boxSizing: 'border-box',
      background: '#0e0f14', color: '#e8e9f0', fontFamily: 'system-ui, sans-serif', fontSize: 13,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 6, borderBottom: '1px solid #2a2c3a' }}>
        <span style={{ color: '#7c6dfa', fontWeight: 700 }}>#{currentChannelName}</span>
        <span style={{ color: '#9496b0', fontSize: 11, marginLeft: 'auto' }}>{remoteUsers.length + 1} in call</span>
      </div>

      {/* Video grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1, overflow: 'auto', alignContent: 'flex-start' }}>
        {/* Local tile */}
        <PopoutVideoTile
          isLocal
          agora={agora}
          label={user.avatar || 'Y'}
          name={user.name}
          color="#7c6dfa"
        />
        {/* Remote tiles */}
        {remoteUsers.map(u => {
          const color = TILE_COLORS[Math.abs(hashCode(String(u.uid))) % TILE_COLORS.length];
          const lbl = String(u.uid).slice(0, 2).toUpperCase();
          return (
            <PopoutVideoTile
              key={u.uid}
              isLocal={false}
              user={u}
              label={lbl}
              name={`User ${String(u.uid).slice(0, 6)}`}
              color={color}
            />
          );
        })}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', paddingTop: 4 }}>
        <button
          onClick={() => agora.toggleMic()}
          style={{
            padding: '6px 14px', borderRadius: 6, border: '1px solid #2a2c3a', cursor: 'pointer',
            background: agora.micEnabled ? '#1a1b24' : '#f04d4d22',
            color: agora.micEnabled ? '#e8e9f0' : '#f04d4d', fontSize: 12,
          }}
        >
          {agora.micEnabled ? '🎙 Mic On' : '🔇 Muted'}
        </button>
        <button
          onClick={() => agora.toggleCamera()}
          style={{
            padding: '6px 14px', borderRadius: 6, border: '1px solid #2a2c3a', cursor: 'pointer',
            background: agora.cameraEnabled ? '#7c6dfa22' : '#1a1b24',
            color: agora.cameraEnabled ? '#7c6dfa' : '#e8e9f0', fontSize: 12,
          }}
        >
          {agora.cameraEnabled ? '📹 Cam On' : '📷 Cam Off'}
        </button>
      </div>
    </div>
  );
}

function PopoutVideoTile({ isLocal, agora, user, label, name, color }) {
  const videoRef = useRef(null);
  const hasVideo = isLocal ? agora.cameraEnabled : user?.hasVideo;
  const localVideoTrack = agora.localVideoTrack?.current;
  const remoteVideoTrack = user?.videoTrack;

  useEffect(() => {
    if (!hasVideo || !videoRef.current) return;

    if (isLocal) {
      let attempts = 0;
      let tid = null;
      let mounted = true;
      const tryPlay = () => {
        if (!mounted) return;
        if (localVideoTrack && videoRef.current) {
          try { localVideoTrack.play(videoRef.current); } catch {}
          return;
        }
        if (attempts++ < 30) tid = setTimeout(tryPlay, 100);
      };
      tryPlay();
      return () => { 
        mounted = false; 
        if (tid) clearTimeout(tid); 
        try { localVideoTrack?.stop?.(); } catch {}
      };
    } else {
      if (remoteVideoTrack && videoRef.current) {
        try { remoteVideoTrack.play(videoRef.current); } catch {}
      }
      return () => { try { remoteVideoTrack?.stop?.(); } catch {} };
    }
  }, [hasVideo, isLocal, localVideoTrack, remoteVideoTrack]);

  return (
    <div style={{
      flex: '1 1 120px', minWidth: 100, aspectRatio: '16/10',
      background: '#13141b', borderRadius: 8, border: '1px solid #2a2c3a',
      position: 'relative', overflow: 'hidden',
    }}>
      <video
        ref={videoRef}
        autoPlay
        muted={isLocal}
        playsInline
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', display: hasVideo ? 'block' : 'none',
        }}
      />
      {!hasVideo && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: color + '22', color, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600,
          }}>
            {label}
          </div>
          <span style={{ fontSize: 11, color: '#9496b0' }}>{name}</span>
        </div>
      )}
      {/* Name overlay */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
        padding: '12px 6px 4px', display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <span style={{ fontSize: 10, fontWeight: 500, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {name}
        </span>
      </div>
    </div>
  );
}

// ─── CallView ──────────────────────────────────────────────────────────────────
export function CallView({ agora }) {
  const {
    currentChannel, currentChannelName, openSettings, setView, addNotification,
    gridColumns, setGridColumns, focusedUser, setFocusedUser, clearFocus,
    tileOrder, setTileOrder, swapTiles, popoutActive, setPopoutActive,
    gameActive, gameStatus, gamePlayers, startGame, joinGame, endGame,
  } = useAppStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [tileSizes, setTileSizes] = useState({}); // { [uid]: flexGrow }
  const [joinedStreams, setJoinedStreams] = useState(new Set()); // Track joined screen shares
  
  // Ambient Sound Toggles & Cinema States
  const [naturePlaying, setNaturePlaying] = useState(false);
  const [lofiPlaying, setLofiPlaying] = useState(false);
  const [movieUrl, setMovieUrl] = useState('https://www.w3schools.com/html/mov_bbb.mp4');
  const [activeMovieUrl, setActiveMovieUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  // New themed room capabilities state variables
  const [activeGameTab, setActiveGameTab] = useState('wordle');
  const [pomoDuration, setPomoDuration] = useState(25);
  const [pomoTimeLeft, setPomoTimeLeft] = useState(25 * 60);
  const [pomoActive, setPomoActive] = useState(false);
  const [isStreamFullscreen, setIsStreamFullscreen] = useState(false);
  const [isTranslateActive, setIsTranslateActive] = useState(false);

  // New draggable layouts, youtube sounds, and resizable control bar states
  const [controlBarHeight, setControlBarHeight] = useState(76);
  const [studyDockPos, setStudyDockPos] = useState({ x: 80, y: 150 });
  const [studyDockSize, setStudyDockSize] = useState({ w: 200, h: 320 });
  const [pomoDockPos, setPomoDockPos] = useState({ x: 520, y: 150 });
  const [pomoDockSize, setPomoDockSize] = useState({ w: 220, h: 220 });
  const [youtubeDockPos, setYoutubeDockPos] = useState({ x: 260, y: 150 });
  const [youtubeDockSize, setYoutubeDockSize] = useState({ w: 290, h: 320 });
  const [customAlarmMin, setCustomAlarmMin] = useState('5');
  const [youtubeQueue, setYoutubeQueue] = useState([
    { id: '2dH7lNcA3MA', title: 'Studio Ghibli Piano ( Hayao Miyazaki )', url: 'https://www.youtube.com/watch?v=2dH7lNcA3MA' },
    { id: 'yv2-8z_p5kw', title: 'Deep Within The Forest ( Rain Lofi )', url: 'https://www.youtube.com/watch?v=yv2-8z_p5kw' },
    { id: '5qap5aO4i9A', title: 'Coffee Shop Cozy Lofi Ambient', url: 'https://www.youtube.com/watch?v=5qap5aO4i9A' }
  ]);
  const [currentQueueIdx, setCurrentQueueIdx] = useState(0);
  const [repeatMode, setRepeatMode] = useState('queue'); // 'off' | 'track' | 'queue'
  const [isShuffleActive, setIsShuffleActive] = useState(false);
  const [addSongUrl, setAddSongUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('https://www.youtube.com/watch?v=2dH7lNcA3MA');
  const [youtubePlaying, setYoutubePlaying] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    const track = youtubeQueue[currentQueueIdx];
    if (track) {
      setYoutubeUrl(track.url);
    }
  }, [currentQueueIdx, youtubeQueue]);

  const resizingRef = useRef(null); // { uid, startX, startSize }
  const callViewRef = useRef(null);
  const popoutRef = useRef(null);
  const popoutRootRef = useRef(null);
  const videoPlayerRef = useRef(null);

  const natureAudioRef = useRef({ context: null, source: null });
  const lofiAudioRef = useRef({ context: null, interval: null, vinylSource: null });

  // ─── Procedural synthesizers ──────────────────────────────────────────────────
  const toggleNatureSounds = () => {
    const refs = natureAudioRef.current;
    if (naturePlaying) {
      if (refs.source) { try { refs.source.stop(); } catch {} refs.source = null; }
      if (refs.context) { try { refs.context.close(); } catch {} refs.context = null; }
      setNaturePlaying(false);
      addNotification('Rain ambient stopped');
    } else {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        refs.context = ctx;
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 750;
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.12;
        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);
        refs.source = source;
        setNaturePlaying(true);
        addNotification('Nature rain sounds active');
      } catch (e) {
        console.error(e);
      }
    }
  };

  const toggleLofiBeats = () => {
    const refs = lofiAudioRef.current;
    if (lofiPlaying) {
      if (refs.interval) { clearInterval(refs.interval); refs.interval = null; }
      if (refs.vinylSource) { try { refs.vinylSource.stop(); } catch {} refs.vinylSource = null; }
      if (refs.context) { try { refs.context.close(); } catch {} refs.context = null; }
      setLofiPlaying(false);
      addNotification('Lofi beats stopped');
    } else {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        refs.context = ctx;
        const bufferSize = ctx.sampleRate * 2.0;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() < 0.0004 ? (Math.random() * 2 - 1) * 0.12 : 0;
        }
        const crackleSrc = ctx.createBufferSource();
        crackleSrc.buffer = buffer;
        crackleSrc.loop = true;
        const crackleGain = ctx.createGain();
        crackleGain.gain.value = 0.04;
        crackleSrc.connect(crackleGain);
        crackleGain.connect(ctx.destination);
        crackleSrc.start(0);
        refs.vinylSource = crackleSrc;

        const progressions = [
          [261.63, 329.63, 392.00, 493.88, 587.33], // Cmaj9
          [220.00, 261.63, 329.63, 392.00, 440.00], // Am9
          [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj9
          [196.00, 246.94, 293.66, 392.00, 493.88]  // G9
        ];
        let chordIdx = 0;
        const playChord = () => {
          if (ctx.state === 'suspended') ctx.resume();
          const freqs = progressions[chordIdx];
          const now = ctx.currentTime;
          freqs.forEach((f) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f + (Math.random() * 0.8 - 0.4), now);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.045, now + 1.0);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 5.0);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(420, now);
            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 5.5);
          });
          chordIdx = (chordIdx + 1) % progressions.length;
        };
        playChord();
        refs.interval = setInterval(playChord, 5200);
        setLofiPlaying(true);
        addNotification('Procedural lofi chords active');
      } catch (e) {
        console.error(e);
      }
    }
  };

  const playJumpSynth = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.15);
      gainNode.gain.setValueAtTime(0.05, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
      setTimeout(() => ctx.close(), 250);
    } catch(e){}
  };

  const playCoinSynth = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.setValueAtTime(1318.51, now + 0.08);
      gainNode.gain.setValueAtTime(0.05, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
      setTimeout(() => ctx.close(), 450);
    } catch(e){}
  };

  const playLevelUpSynth = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const freqs = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      const now = ctx.currentTime;
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const t = now + idx * 0.08;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(0.05, t + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.32);
      });
      setTimeout(() => ctx.close(), 1000);
    } catch(e){}
  };

  const handleSyncPlay = () => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.play();
      setIsPlaying(true);
      addNotification('Movie playing for all members');
    }
  };

  const handleSyncPause = () => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.pause();
      setIsPlaying(false);
      addNotification('Movie paused');
    }
  };

  const playAlarmPing = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playBeep = (time, duration) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, time);
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.2, time + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + duration);
      };
      
      const now = ctx.currentTime;
      // Pair 1
      playBeep(now, 0.15);
      playBeep(now + 0.22, 0.15);
      
      // Pair 2
      playBeep(now + 0.6, 0.15);
      playBeep(now + 0.82, 0.15);

      setTimeout(() => ctx.close(), 1500);
    } catch(e){}
  };

  // Pomodoro synchronization logic
  useEffect(() => {
    const handleSync = (e) => {
      const { action, duration, endTime } = e.detail;
      if (action === 'start') {
        setPomoDuration(duration);
        setPomoActive(true);
        const rem = Math.max(0, Math.round((endTime - Date.now()) / 1000));
        setPomoTimeLeft(rem);
      } else if (action === 'pause') {
        setPomoActive(false);
      } else if (action === 'reset') {
        setPomoActive(false);
        setPomoTimeLeft(duration * 60);
      }
    };
    window.addEventListener('pomodoro-sync-evt', handleSync);
    return () => window.removeEventListener('pomodoro-sync-evt', handleSync);
  }, []);

  useEffect(() => {
    if (!pomoActive) return;
    const timer = setInterval(() => {
      setPomoTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setPomoActive(false);
          playAlarmPing();
          addNotification('Pomodoro finished!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pomoActive]);

  const startPomodoro = (mins) => {
    const endTime = Date.now() + mins * 60 * 1000;
    setPomoDuration(mins);
    setPomoTimeLeft(mins * 60);
    setPomoActive(true);
    if (typeof agora.sendCustomStreamMessage === 'function') {
      agora.sendCustomStreamMessage({
        type: 'pomodoro-sync',
        action: 'start',
        duration: mins,
        endTime
      });
    }
  };

  const pausePomodoro = () => {
    setPomoActive(false);
    if (typeof agora.sendCustomStreamMessage === 'function') {
      agora.sendCustomStreamMessage({
        type: 'pomodoro-sync',
        action: 'pause'
      });
    }
  };

  const resetPomodoro = () => {
    setPomoActive(false);
    setPomoTimeLeft(pomoDuration * 60);
    if (typeof agora.sendCustomStreamMessage === 'function') {
      agora.sendCustomStreamMessage({
        type: 'pomodoro-sync',
        action: 'reset',
        duration: pomoDuration
      });
    }
  };

  // YouTube and UI drag handles
  const getYoutubeId = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  const handleControlResizeMouseDown = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = controlBarHeight;
    const handleMouseMove = (moveEvent) => {
      const deltaY = startY - moveEvent.clientY; // moving up increases height
      const newHeight = Math.max(50, Math.min(185, startHeight + deltaY));
      setControlBarHeight(newHeight);
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleStudyDockMoveMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('.leaf-video-tile')) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = studyDockPos.x;
    const initialY = studyDockPos.y;
    
    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setStudyDockPos({
        x: initialX + dx,
        y: initialY + dy
      });
    };
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleStudyDockResizeMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialW = studyDockSize.w;
    const initialH = studyDockSize.h;
    
    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setStudyDockSize({
        w: Math.max(150, Math.min(600, initialW + dx)),
        h: Math.max(150, Math.min(800, initialH + dy))
      });
    };
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  const handlePomoDockMoveMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = pomoDockPos.x;
    const initialY = pomoDockPos.y;
    
    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setPomoDockPos({
        x: initialX + dx,
        y: initialY + dy
      });
    };
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handlePomoDockResizeMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialW = pomoDockSize.w;
    const initialH = pomoDockSize.h;
    
    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setPomoDockSize({
        w: Math.max(160, Math.min(500, initialW + dx)),
        h: Math.max(160, Math.min(500, initialH + dy))
      });
    };
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleYoutubeDockMoveMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = youtubeDockPos.x;
    const initialY = youtubeDockPos.y;
    
    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setYoutubeDockPos({
        x: initialX + dx,
        y: initialY + dy
      });
    };
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleYoutubeDockResizeMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialW = youtubeDockSize.w;
    const initialH = youtubeDockSize.h;
    
    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setYoutubeDockSize({
        w: Math.max(160, Math.min(500, initialW + dx)),
        h: Math.max(120, Math.min(500, initialH + dy))
      });
    };
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Load YouTube Player API if not already present
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  const youtubeStateRef = useRef({ youtubeQueue, currentQueueIdx, repeatMode, isShuffleActive, youtubePlaying });
  useEffect(() => {
    youtubeStateRef.current = { youtubeQueue, currentQueueIdx, repeatMode, isShuffleActive, youtubePlaying };
  }, [youtubeQueue, currentQueueIdx, repeatMode, isShuffleActive, youtubePlaying]);

  const initYoutubePlayer = () => {
    const id = getYoutubeId(youtubeUrl);
    if (!id) return;
    
    if (window.YT && window.YT.Player) {
      if (ytPlayerRef.current) {
        try {
          if (typeof ytPlayerRef.current.loadVideoById === 'function') {
            ytPlayerRef.current.loadVideoById(id);
            if (youtubePlaying) {
              ytPlayerRef.current.playVideo();
            } else {
              ytPlayerRef.current.pauseVideo();
            }
            return;
          }
        } catch (e) {
          console.warn("Failed to update YouTube video ID directly, rebuilding...", e);
        }
      }
      
      try {
        ytPlayerRef.current = new window.YT.Player('youtube-player-element', {
          height: '1',
          width: '1',
          videoId: id,
          playerVars: {
            autoplay: youtubePlaying ? 1 : 0,
            controls: 0,
            loop: 0
          },
          events: {
            onReady: (event) => {
              if (youtubePlaying) {
                event.target.playVideo();
              } else {
                event.target.pauseVideo();
              }
            },
            onStateChange: (event) => {
              // event.data === 0 means video ended
              if (event.data === 0) {
                const state = youtubeStateRef.current;
                if (state.youtubeQueue.length === 0) return;
                
                if (state.repeatMode === 'track') {
                  event.target.seekTo(0, true);
                  event.target.playVideo();
                  return;
                }
                
                if (state.isShuffleActive) {
                  const randomIdx = Math.floor(Math.random() * state.youtubeQueue.length);
                  setCurrentQueueIdx(randomIdx);
                  return;
                }
                
                if (state.currentQueueIdx < state.youtubeQueue.length - 1) {
                  setCurrentQueueIdx(prev => prev + 1);
                } else if (state.repeatMode === 'queue') {
                  setCurrentQueueIdx(0);
                } else {
                  setYoutubePlaying(false);
                }
              }
            }
          }
        });
      } catch (err) {
        console.error("Error instantiating YouTube player element:", err);
      }
    }
  };

  useEffect(() => {
    let checkInterval = null;
    if (getYoutubeId(youtubeUrl)) {
      if (window.YT && window.YT.Player) {
        initYoutubePlayer();
      } else {
        checkInterval = setInterval(() => {
          if (window.YT && window.YT.Player) {
            initYoutubePlayer();
            clearInterval(checkInterval);
          }
        }, 500);
      }
    }
    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [youtubeUrl]);

  const handleYoutubePlay = () => {
    const player = ytPlayerRef.current;
    if (player && typeof player.playVideo === 'function') {
      try { player.playVideo(); } catch {}
    }
    setYoutubePlaying(true);
    addNotification('Lofi stream playing');
  };

  const handleYoutubePause = () => {
    const player = ytPlayerRef.current;
    if (player && typeof player.pauseVideo === 'function') {
      try { player.pauseVideo(); } catch {}
    }
    setYoutubePlaying(false);
    addNotification('Lofi stream paused');
  };

  const handleYoutubeSeek = (seconds) => {
    const player = ytPlayerRef.current;
    if (player && typeof player.getCurrentTime === 'function' && typeof player.seekTo === 'function') {
      try {
        const cur = player.getCurrentTime();
        player.seekTo(cur + seconds, true);
        addNotification(`Seeked lofi stream ${seconds > 0 ? '+' : ''}${seconds}s`);
      } catch {}
    }
  };

  const handleYoutubeNext = () => {
    if (youtubeQueue.length === 0) return;
    if (repeatMode === 'track') {
      const player = ytPlayerRef.current;
      if (player && typeof player.seekTo === 'function') {
        player.seekTo(0, true);
        player.playVideo();
      }
      return;
    }
    if (isShuffleActive) {
      const randomIdx = Math.floor(Math.random() * youtubeQueue.length);
      setCurrentQueueIdx(randomIdx);
      addNotification('Skipped to random track');
      return;
    }
    if (currentQueueIdx < youtubeQueue.length - 1) {
      setCurrentQueueIdx(prev => prev + 1);
    } else if (repeatMode === 'queue') {
      setCurrentQueueIdx(0);
      addNotification('Looping queue start');
    }
  };

  const handleYoutubePrev = () => {
    if (youtubeQueue.length === 0) return;
    if (currentQueueIdx > 0) {
      setCurrentQueueIdx(prev => prev - 1);
    } else if (repeatMode === 'queue') {
      setCurrentQueueIdx(youtubeQueue.length - 1);
    }
  };

  const handleYoutubeAddTrack = () => {
    const id = getYoutubeId(addSongUrl);
    if (!id) {
      addNotification('Invalid YouTube link format');
      return;
    }
    const newTrack = {
      id,
      title: `Lofi Track #${youtubeQueue.length + 1} (${id})`,
      url: addSongUrl
    };
    setYoutubeQueue(prev => [...prev, newTrack]);
    setAddSongUrl('');
    addNotification('Appended song to playlist queue');
  };

  const handleYoutubeRemoveTrack = (indexToRemove) => {
    if (youtubeQueue.length <= 1) {
      addNotification('Cannot clear the last remaining track');
      return;
    }
    setYoutubeQueue(prev => prev.filter((_, idx) => idx !== indexToRemove));
    if (currentQueueIdx === indexToRemove) {
      setCurrentQueueIdx(0);
    } else if (currentQueueIdx > indexToRemove) {
      setCurrentQueueIdx(prev => prev - 1);
    }
    addNotification('Removed track');
  };

  // Reset selected game & close active states when switching channels
  useEffect(() => {
    setSelectedGame(null);
    if (gameActive && typeof endGame === 'function') {
      endGame();
    }
  }, [currentChannel]);
  // Cleanup Web Audio nodes on unmount
  useEffect(() => {
    return () => {
      const nRefs = natureAudioRef.current;
      if (nRefs.source) { try { nRefs.source.stop(); } catch {} }
      if (nRefs.context) { try { nRefs.context.close(); } catch {} }
      const lRefs = lofiAudioRef.current;
      if (lRefs.interval) clearInterval(lRefs.interval);
      if (lRefs.vinylSource) { try { lRefs.vinylSource.stop(); } catch {} }
      if (lRefs.context) { try { lRefs.context.close(); } catch {} }
    };
  }, []);

  const handleLeave = () => {
    closePopout();
    agora.leave();
    setView('home');
    addNotification('Left the channel');
  };

  // Fullscreen
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Build tile list
  const remoteUsers = agora.remoteUsers;
  const allTiles = [
    { type: 'local', uid: '__local__', agora },
    ...remoteUsers.map(u => ({ type: 'remote', uid: String(u.uid), user: u })),
  ];

  // Apply tile order
  const orderedTiles = tileOrder.length === allTiles.length
    ? tileOrder.map(i => allTiles[i]).filter(Boolean)
    : allTiles;

  // Initialize tile order when tiles change
  useEffect(() => {
    if (tileOrder.length !== allTiles.length) {
      setTileOrder(allTiles.map((_, i) => i));
    }
  }, [allTiles.length]);

  // Clean up tileSizes when tiles leave
  useEffect(() => {
    const validUids = new Set(allTiles.map(t => t.uid));
    setTileSizes(prev => {
      const next = {};
      for (const [k, v] of Object.entries(prev)) {
        if (validUids.has(k)) next[k] = v;
      }
      return next;
    });
  }, [allTiles.length]);

  const totalInCall = remoteUsers.length + 1;

  // Grid columns logic
  const effectiveCols = gridColumns === 'auto'
    ? (totalInCall <= 1 ? 1 : totalInCall <= 2 ? 2 : totalInCall <= 4 ? 2 : 3)
    : gridColumns;

  const isFocused = focusedUser !== null;
  const focusedTile = isFocused
    ? orderedTiles.find(t => {
        if (focusedUser === '__local__') return t.uid === '__local__';
        return String(t.uid) === String(focusedUser);
      })
    : null;
  const stripTiles = isFocused ? orderedTiles.filter(t => t.uid !== focusedUser) : [];

  // ── Tile resize ──────────────────────────────────────────────────────────────
  const handleResizeStart = useCallback((uid, startX, startFlex) => {
    resizingRef.current = { uid, startX, startFlex };

    const handleMove = (e) => {
      const ref = resizingRef.current;
      if (!ref) return;
      const container = callViewRef.current?.querySelector('.tiles-flex');
      if (!container) return;

      const containerWidth = container.offsetWidth;
      const dx = e.clientX - ref.startX;
      // Convert pixel delta to flex-grow delta
      const totalTiles = orderedTiles.length;
      const baseTileWidth = containerWidth / Math.min(totalTiles, effectiveCols);
      const deltaGrow = dx / baseTileWidth;
      const newFlex = Math.max(0.3, Math.min(3, ref.startFlex + deltaGrow));

      setTileSizes(prev => ({ ...prev, [ref.uid]: newFlex }));
    };

    const handleUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [orderedTiles.length, effectiveCols]);

  // ── Drag-to-swap ─────────────────────────────────────────────────────────────
  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = (idx) => {
    if (dragIdx !== null && dragIdx !== idx) swapTiles(dragIdx, idx);
    setDragIdx(null);
    setDragOverIdx(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

  // Focus handler
  const handleFocusToggle = (uid) => {
    if (focusedUser === uid) clearFocus();
    else setFocusedUser(uid);
  };

  // ── Join Stream handler ──────────────────────────────────────────────────────
  const handleJoinStream = useCallback((streamUid) => {
    setJoinedStreams(prev => {
      const next = new Set(prev);
      next.add(streamUid);
      return next;
    });
    // Automatically focus the stream when joining it
    setFocusedUser(streamUid);
  }, [setFocusedUser]);

  // ── Popout (Document PiP with real React + video) ────────────────────────────
  const handlePopout = useCallback(async () => {
    if (popoutActive) return;

    try {
      // @ts-ignore — Document PiP API (Chrome 116+)
      const pipWindow = await documentPictureInPicture.requestWindow({ width: 480, height: 360 });
      popoutRef.current = pipWindow;

      // Copy stylesheets into the PiP window
      for (const sheet of document.styleSheets) {
        try {
          const clone = sheet.ownerNode.cloneNode(true);
          pipWindow.document.head.appendChild(clone);
        } catch {}
      }

      pipWindow.document.title = 'JUNO — Call Popout';
      pipWindow.document.body.style.cssText = 'margin:0;overflow:hidden;';
      const rootEl = pipWindow.document.createElement('div');
      rootEl.style.cssText = 'height:100vh;';
      pipWindow.document.body.appendChild(rootEl);

      // Create a React root and render the popout content
      const root = createRoot(rootEl);
      popoutRootRef.current = root;
      root.render(<PopoutContent agora={agora} />);

      setPopoutActive(true);

      pipWindow.addEventListener('pagehide', () => {
        root.unmount();
        popoutRootRef.current = null;
        popoutRef.current = null;
        setPopoutActive(false);
      });
    } catch (err) {
      console.warn('Popout failed:', err);
      addNotification('Popout not supported in this browser');
    }
  }, [popoutActive, agora, addNotification]);

  const closePopout = useCallback(() => {
    if (popoutRootRef.current) {
      try { popoutRootRef.current.unmount(); } catch {}
      popoutRootRef.current = null;
    }
    if (popoutRef.current) {
      try { popoutRef.current.close(); } catch {}
      popoutRef.current = null;
    }
    setPopoutActive(false);
  }, []);

  useEffect(() => () => closePopout(), []);

  // ── Render a tile ────────────────────────────────────────────────────────────
  const renderTile = (tile, idx, variant = 'main') => {
    const uid = tile.uid;
    const isTileFocused = focusedUser === uid;
    const flexGrow = tileSizes[uid] || 1;

    const commonDrag = variant === 'strip' ? {} : {
      draggable: true,
      onDragStart: (e) => {
        // Don't initiate a tile-reorder drag when the gesture started on the
        // per-stream volume slider — otherwise dragging the slider thumb gets
        // hijacked by the tile's native HTML5 drag-and-drop.
        if (e.target.closest?.('.stream-volume-control')) {
          e.preventDefault();
          return;
        }
        handleDragStart(idx);
      },
      onDragOver: (e) => handleDragOver(e, idx),
      onDrop: () => handleDrop(idx),
      onDragEnd: handleDragEnd,
    };

    const classes = [
      'video-tile',
      isTileFocused ? 'focused' : '',
      dragIdx === idx ? 'dragging' : '',
      dragOverIdx === idx ? 'drag-over' : '',
      variant === 'strip' ? 'strip-tile' : '',
    ].filter(Boolean).join(' ');

    const style = variant === 'strip' ? {} : { 
      flex: flexGrow, 
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column'
    };

    return (
      <div key={uid} {...commonDrag} className={classes} style={style}>
        {variant !== 'strip' && <div className="tile-drag-handle" />}
        <VideoTile
          uid={uid}
          type={tile.type}
          agora={tile.agora || agora}
          user={tile.user}
          flexGrow={flexGrow}
          onResizeStart={variant === 'strip' ? () => {} : handleResizeStart}
          onDoubleClick={() => variant !== 'strip' && handleFocusToggle(uid)}
          isFocused={isTileFocused}
          isStrip={variant === 'strip'}
          isStreamJoined={joinedStreams.has(uid)}
          onJoinStream={handleJoinStream}
          popoutActive={popoutActive}
        />
      </div>
    );
  };

  // Screen share tracking and camera filter logic for Movie & Study rooms
  const remoteScreenTile = orderedTiles.find(t => t.type === 'remote' && t.user?.isScreenShare);
  const activeStream = remoteScreenTile || (agora.screenShareEnabled ? { type: 'local', uid: '__local__', agora } : null);
  const activeCams = orderedTiles.filter(t => !t.user?.isScreenShare && (t.type === 'local' ? agora.cameraEnabled : t.user?.hasVideo));

  // Rows for the flex grid (split orderedTiles into rows of `effectiveCols`)
  const rows = [];
  if (!isFocused && !gameActive) {
    for (let i = 0; i < orderedTiles.length; i += effectiveCols) {
      rows.push(orderedTiles.slice(i, i + effectiveCols));
    }
  }

  const handleToggleStreamTranslation = () => {
    if (isTranslateActive) {
      agora.stopSubtitling();
      setIsTranslateActive(false);
      addNotification('Stream translation disabled');
    } else {
      if (remoteScreenTile?.user?.audioTrack) {
        agora.startSubtitling({ current: remoteScreenTile.user.audioTrack }, window.ccFromLang || 'zh-CN', window.ccToLang || 'en');
        setIsTranslateActive(true);
        addNotification(`Translating stream audio: ${window.ccFromLang || 'zh-CN'} to ${window.ccToLang || 'en'}`);
      } else if (agora.screenShareEnabled) {
        addNotification('Cannot translate your own local screen track!');
      } else {
        addNotification('No screen share audio track detected for translation');
      }
    }
  };

  return (
    <div className={`call-view theme-${currentChannel || 'general'}`} ref={callViewRef}>
      <div className="call-header">
        <div className="call-header-left">
          <div className="channel-indicator">
            <Mic size={14} aria-hidden />
            <span className="font-mono" style={{ fontSize: 13 }}>{currentChannelName}</span>
          </div>
          {agora.networkQuality && <NetQuality quality={agora.networkQuality} />}
          {!agora.joined && (
            <span className="connecting-badge">
              <span className="blink-dot" aria-hidden />
              connecting...
            </span>
          )}
        </div>
        <div className="call-header-right">
          <GridSizePicker value={gridColumns} onChange={setGridColumns} />
          {isFocused && (
            <button className="header-btn" onClick={clearFocus} title="Clear focus">
              <Focus size={16} />
            </button>
          )}
          <button className="header-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button
            className={`header-btn ${popoutActive ? 'active' : ''}`}
            onClick={popoutActive ? closePopout : handlePopout}
            title={popoutActive ? 'Close popout' : 'Pop out'}
          >
            <ExternalLink size={16} />
          </button>
          <button className="header-btn" onClick={() => openSettings('audio')} title="Settings">
            <Settings size={16} aria-hidden />
          </button>
        </div>
      </div>

      {/* Gaming HUD panel & Soundboard */}
      {currentChannel === 'gaming' && (
        <div className="gaming-hud-panel">
          <div className="hud-header">
            <span className="hud-title">GAMING HUD</span>
            <div className="live-dot" />
          </div>
          <div className="hud-metrics">
            <div className="metric">
              <span className="label">CALL PING</span>
              <span className="value text-purple-400 font-mono">{agora.ping || 0} ms</span>
            </div>
            <div className="metric">
              <span className="label">STATUS</span>
              <span className="value text-emerald-400 font-mono">{agora.connectionState}</span>
            </div>
          </div>
          <div className="soundboard-section">
            <span className="soundboard-title">SOUNDBOARD</span>
            <div className="soundboard-grid">
              <button onClick={playJumpSynth} className="soundboard-btn">👾 JUMP</button>
              <button onClick={playCoinSynth} className="soundboard-btn">🪙 COIN</button>
              <button onClick={playLevelUpSynth} className="soundboard-btn">⭐ LEVEL UP</button>
            </div>
          </div>
        </div>
      )}

      {/* Lofi Room Synced Pomodoro Timer Capsule */}
      {currentChannel === 'chill-beats' && (
        <>
      {/* Draggable & Resizable Pomodoro / Custom Alarm Timer Pod */}
      {(currentChannel === 'study-room' || currentChannel === 'chill-beats') && (
        <div 
          className="study-pomo-alarm-pod flex flex-col"
          style={{
            left: `${pomoDockPos.x}px`,
            top: `${pomoDockPos.y}px`,
            width: `${pomoDockSize.w}px`,
            height: `${pomoDockSize.h}px`,
            position: 'absolute'
          }}
        >
          <div className="pod-header" onMouseDown={handlePomoDockMoveMouseDown} style={{ cursor: 'move', userSelect: 'none' }}>
            <span className="pod-title">⏱️ TIMER & ALARM</span>
            <div className={`live-dot ${pomoActive ? 'active' : ''}`} />
          </div>

          <div className="pod-timer-display text-center py-3 font-extrabold tracking-wide" style={{ color: '#ffffff', fontSize: '36px', lineHeight: '1', fontFamily: '"DM Sans", sans-serif', textShadow: '0 2px 10px rgba(124,109,250,0.5)' }}>
            {Math.floor(pomoTimeLeft / 60).toString().padStart(2, '0')}:{(pomoTimeLeft % 60).toString().padStart(2, '0')}
          </div>

          <div className="pod-timer-content flex-1 overflow-y-auto px-2 pb-2 text-[10px] flex flex-col gap-2">
            {/* Custom alarm section */}
            <div className="custom-alarm-section flex flex-col gap-1 bg-black/15 p-1.5 rounded border border-white/5">
              <span className="font-bold text-zinc-400">CUSTOM ALARM TIME</span>
              <div className="flex gap-1 items-center">
                <input 
                  type="number" 
                  min="1" 
                  max="300"
                  value={customAlarmMin} 
                  onChange={(e) => setCustomAlarmMin(e.target.value)} 
                  placeholder="Mins"
                  className="w-16 px-1.5 py-0.5 bg-zinc-800 text-white rounded outline-none border border-white/5"
                  style={{ fontSize: '9px' }}
                />
                <button 
                  onClick={() => {
                    const m = parseFloat(customAlarmMin);
                    if (!isNaN(m) && m > 0) {
                      startPomodoro(m);
                      addNotification(`Custom alarm set for ${m} mins`);
                    }
                  }} 
                  className="flex-1 py-0.5 rounded bg-purple-600 hover:bg-purple-500 font-bold transition text-white"
                  style={{ fontSize: '9px' }}
                >
                  Set Alarm
                </button>
              </div>
            </div>

            {/* Pomodoro standard presets */}
            <div className="presets-section flex flex-col gap-1 bg-black/10 p-1 rounded border border-white/5">
              <span className="font-bold text-zinc-400" style={{ fontSize: '8px' }}>POMODORO PRESETS</span>
              <div className="flex gap-1 justify-between">
                <button onClick={() => { startPomodoro(25); addNotification('Pomodoro set: 25 mins'); }} className="preset-btn flex-1 py-0.5 bg-zinc-800 text-zinc-300 rounded font-semibold text-[9px] hover:text-white transition">25m</button>
                <button onClick={() => { startPomodoro(30); addNotification('Pomodoro set: 30 mins'); }} className="preset-btn flex-1 py-0.5 bg-zinc-800 text-zinc-300 rounded font-semibold text-[9px] hover:text-white transition">30m</button>
                <button onClick={() => { startPomodoro(45); addNotification('Pomodoro set: 45 mins'); }} className="preset-btn flex-1 py-0.5 bg-zinc-800 text-zinc-300 rounded font-semibold text-[9px] hover:text-white transition">45m</button>
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex gap-1 justify-center mt-auto">
              {pomoActive ? (
                <button onClick={pausePomodoro} className="pomo-ctrl-btn pause flex-1 py-1 rounded font-bold text-white bg-amber-600 hover:bg-amber-500 transition text-[9px]">PAUSE</button>
              ) : (
                <button onClick={() => startPomodoro(pomoDuration)} className="pomo-ctrl-btn start flex-1 py-1 rounded font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition text-[9px]">START</button>
              )}
              <button onClick={resetPomodoro} className="pomo-ctrl-btn reset flex-1 py-1 rounded font-bold text-white bg-zinc-700 hover:bg-zinc-600 transition text-[9px]">RESET</button>
            </div>
          </div>

          {/* Corner resize handle */}
          <div 
            onMouseDown={handlePomoDockResizeMouseDown}
            style={{
              position: 'absolute',
              right: '2px',
              bottom: '2px',
              width: '10px',
              height: '10px',
              cursor: 'se-resize',
              background: 'rgba(255, 255, 255, 0.25)',
              borderRadius: '2px',
              zIndex: 20
            }}
          />
        </div>
      )}

          <div 
            className="lofi-youtube-ambient-control study-pomo-alarm-pod flex flex-col"
            style={{
              left: `${youtubeDockPos.x}px`,
              top: `${youtubeDockPos.y}px`,
              width: `${youtubeDockSize.w}px`,
              height: `${youtubeDockSize.h}px`,
              position: 'absolute',
              zIndex: 100
            }}
          >
            <div className="pod-header" onMouseDown={handleYoutubeDockMoveMouseDown} style={{ cursor: 'move', userSelect: 'none' }}>
              <span className="pod-title flex items-center gap-1.5"><ListMusic size={14} /> LOFI STREAM PLAYLIST</span>
              <div className={`live-dot ${youtubePlaying ? 'active' : ''}`} />
            </div>

            <div className="pod-timer-content flex-1 overflow-y-auto px-3 pb-3 text-[10px] flex flex-col gap-3.5 pt-3 font-sans">
              {/* Now Playing Header Card */}
              <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col gap-2 shadow-inner">
                <span className="font-bold text-[8px] text-zinc-400 tracking-widest">NOW PLAYING</span>
                <span className="font-extrabold text-[11px] text-white truncate flex items-center gap-1" title={youtubeQueue[currentQueueIdx]?.title}>
                  💿 {youtubeQueue[currentQueueIdx]?.title || 'No track playing'}
                </span>
                
                {/* Spotify-like playback controls deck */}
                <div className="flex gap-2 justify-center items-center mt-2">
                  {/* Shuffle */}
                  <button 
                    onClick={() => setIsShuffleActive(!isShuffleActive)} 
                    className={`playlist-ctrl-btn ${isShuffleActive ? 'active' : ''}`}
                    title="Shuffle (Random selection)"
                  >
                    <Shuffle size={12} />
                  </button>

                  {/* Previous */}
                  <button 
                    onClick={handleYoutubePrev} 
                    className="playlist-ctrl-btn"
                    title="Previous Track"
                  >
                    <SkipBack size={12} />
                  </button>

                  {/* Seek Back 10s */}
                  <button 
                    onClick={() => handleYoutubeSeek(-10)} 
                    className="playlist-ctrl-btn text-[8px] font-bold"
                    title="Skip Back 10s"
                  >
                    -10s
                  </button>

                  {/* Play/Pause */}
                  <button 
                    onClick={youtubePlaying ? handleYoutubePause : handleYoutubePlay} 
                    className="playlist-ctrl-btn play-pause-btn"
                    title={youtubePlaying ? 'Pause' : 'Play'}
                  >
                    {youtubePlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                  </button>

                  {/* Seek Forward 10s */}
                  <button 
                    onClick={() => handleYoutubeSeek(10)} 
                    className="playlist-ctrl-btn text-[8px] font-bold"
                    title="Skip Forward 10s"
                  >
                    +10s
                  </button>

                  {/* Next */}
                  <button 
                    onClick={handleYoutubeNext} 
                    className="playlist-ctrl-btn"
                    title="Next Track"
                  >
                    <SkipForward size={12} />
                  </button>

                  {/* Repeat Cycle */}
                  <button 
                    onClick={() => {
                      if (repeatMode === 'off') setRepeatMode('queue');
                      else if (repeatMode === 'queue') setRepeatMode('track');
                      else setRepeatMode('off');
                    }} 
                    className={`playlist-ctrl-btn ${repeatMode !== 'off' ? 'active' : ''}`}
                    title={`Repeat Mode: ${repeatMode}`}
                  >
                    <Repeat size={12} />
                    {repeatMode === 'track' && <span className="absolute text-[6px] font-black top-[-2px] right-[-2px] bg-red-500 rounded-full px-0.5 text-white">1</span>}
                  </button>
                </div>
              </div>

              {/* Paste & Add YouTube Link wrapper */}
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-zinc-400 tracking-wider text-[8px]">ADD TO PLAYLIST QUEUE</span>
                <div className="playlist-input-wrapper flex items-center bg-zinc-900/60 border border-white/10 rounded-lg p-1">
                  <input 
                    type="text" 
                    value={addSongUrl} 
                    onChange={(e) => setAddSongUrl(e.target.value)} 
                    placeholder="Paste YouTube music link..."
                    className="flex-1 bg-transparent text-white text-[10px] outline-none px-2 py-1 placeholder-zinc-500 font-sans"
                  />
                  <button 
                    onClick={handleYoutubeAddTrack} 
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-500 transition text-white font-bold rounded-md text-[10px] flex items-center gap-1"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
              </div>

              {/* Scrollable Track Queue */}
              <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                <span className="font-bold text-zinc-400 tracking-wider text-[8px]">PLAYLIST QUEUE ({youtubeQueue.length} SONGS)</span>
                <div className="flex flex-col gap-1.5">
                  {youtubeQueue.map((track, idx) => (
                    <div 
                      key={`${track.id}-${idx}`}
                      className={`flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer transition ${currentQueueIdx === idx ? 'bg-purple-600/35 border border-purple-500/50 text-white font-bold' : 'bg-zinc-900/40 hover:bg-zinc-800/50 border border-white/5 text-zinc-300'}`}
                      onClick={() => {
                        setCurrentQueueIdx(idx);
                        if (!youtubePlaying) handleYoutubePlay();
                      }}
                      style={{ minHeight: '34px' }}
                    >
                      <span className="truncate flex-1 pr-2 text-[10px] font-sans flex items-center gap-1.5">
                        {currentQueueIdx === idx ? '🎶' : <ListMusic size={11} className="text-zinc-500" />}
                        {track.title}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleYoutubeRemoveTrack(idx);
                        }}
                        className="text-zinc-500 hover:text-rose-400 p-1 transition-colors"
                        title="Remove Track"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Hidden div target for YouTube API to bind to */}
            <div id="youtube-player-element" style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}></div>

            <div 
              onMouseDown={handleYoutubeDockResizeMouseDown}
              style={{
                position: 'absolute',
                right: '2px',
                bottom: '2px',
                width: '10px',
                height: '10px',
                cursor: 'se-resize',
                background: 'rgba(255, 255, 255, 0.25)',
                borderRadius: '2px',
                zIndex: 20
              }}
            />
          </div>
        </>
      )}

      {/* Forest Study Room: Draggable & Resizable Tree Pod */}
      {currentChannel === 'study-room' && (
        <div 
          className="study-tree-pod flex flex-col" 
          style={{
            left: `${studyDockPos.x}px`,
            top: `${studyDockPos.y}px`,
            width: `${studyDockSize.w}px`,
            height: `${studyDockSize.h}px`,
            position: 'absolute'
          }}
        >
          <div className="pod-header" onMouseDown={handleStudyDockMoveMouseDown} style={{ cursor: 'move', userSelect: 'none' }}>
            <span className="pod-title">STUDY DOCK</span>
            <div className="live-dot" />
          </div>

          <div className="p-2 border-b border-white/5 bg-black/25 text-[10px]">
            <input 
              type="text" 
              value={youtubeUrl} 
              onChange={(e) => setYoutubeUrl(e.target.value)} 
              placeholder="Paste YouTube Link"
              className="w-full px-2 py-0.5 bg-zinc-800 text-white rounded outline-none border border-white/5"
              style={{ fontSize: '9px' }}
            />
            <button 
              onClick={() => setYoutubePlaying(!youtubePlaying)} 
              className={`w-full mt-1.5 py-0.5 rounded font-bold transition ${youtubePlaying ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}
              style={{ fontSize: '9px' }}
            >
              {youtubePlaying ? '⏸️ PAUSE AMBIENT' : '▶️ PLAY YOUTUBE AMBIENT'}
            </button>
          </div>

          {youtubePlaying && getYoutubeId(youtubeUrl) && (
            <iframe
              width="1"
              height="1"
              src={`https://www.youtube.com/embed/${getYoutubeId(youtubeUrl)}?autoplay=1&loop=1&playlist=${getYoutubeId(youtubeUrl)}`}
              title="YouTube Ambient Source"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
            />
          )}

          <div className="pod-tiles-container flex-1 overflow-y-auto">
            {orderedTiles.map((tile) => (
              <div key={tile.uid} className="leaf-video-tile" title={tile.type === 'local' ? 'You' : `User ${tile.uid}`}>
                {tile.type === 'local'
                  ? <VideoTile uid={tile.uid} type="local" agora={agora} flexGrow={1} onResizeStart={() => {}} onDoubleClick={() => {}} isStrip popoutActive={popoutActive} minimalStudyMode={true} />
                  : <VideoTile uid={tile.uid} type="remote" user={tile.user} flexGrow={1} onResizeStart={() => {}} onDoubleClick={() => {}} isStrip popoutActive={popoutActive} minimalStudyMode={true} />
                }
              </div>
            ))}
          </div>

          <div 
            onMouseDown={handleStudyDockResizeMouseDown}
            style={{
              position: 'absolute',
              right: '2px',
              bottom: '2px',
              width: '10px',
              height: '10px',
              cursor: 'se-resize',
              background: 'rgba(255, 255, 255, 0.25)',
              borderRadius: '2px',
              zIndex: 20
            }}
          />
        </div>
      )}

      {/* Movie Room Cinematic Screenshare Layout */}
      {currentChannel === 'movie-party' && (
        <div className="movie-party-theater">
          {/* Cinema Curtains & Screen Bezel Frame */}
          <div className="cinema-main-stage">
            <div className="theater-curtain left-curtain"></div>
            <div className="theater-curtain right-curtain"></div>
            <div className="projector-beam-overlay"></div>
            {!activeStream ? (
              <div className="movie-url-form cinema-waiting-room">
                <div className="curtain-glow" />
                <h3>CINEMA SCREEN</h3>
                <p className="text-xs text-zinc-400 mb-4 font-sans tracking-wide">WAITING FOR PROJECTOR SCREEN SHARE...</p>
                <div className="projector-glow-icon animate-pulse" style={{ fontSize: '48px' }}>🎬</div>
              </div>
            ) : (
              <div className="theater-screen-wrapper">
                <div className="theater-screen-bezel">
                  <div className="theater-projection-container">
                    {activeStream.type === 'local' ? (
                      <ScreenTile getLocalScreenTrack={agora.getLocalScreenTrack} />
                    ) : (
                      <VideoTile uid={activeStream.uid} type={activeStream.type} agora={activeStream.agora || agora} user={activeStream.user} flexGrow={1} onResizeStart={() => {}} onDoubleClick={() => {}} popoutActive={popoutActive} />
                    )}
                  </div>
                </div>

                {/* Subtitles Overlay */}
                {Object.values(subtitles).some(Boolean) && (
                  <div className="cinema-caption-overlay">
                    {Object.entries(subtitles).map(([uid, text]) => text && (
                      <div key={uid} className="caption-line">{text}</div>
                    ))}
                  </div>
                )}

                <div className="theater-overlay-bar">
                  <div className="theater-controls-left">
                    <span className="live-badge">🎬 MOVIE PLAYING</span>
                  </div>
                  <div className="theater-controls-center flex gap-2">
                    <button 
                      onClick={handleToggleStreamTranslation} 
                      className={`theater-btn px-4 py-1.5 text-xs font-bold rounded-lg border transition ${isTranslateActive ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}
                    >
                      🗣️ {isTranslateActive ? 'Live Translation Active' : 'Auto Translate Captions'}
                    </button>
                    <button 
                      onClick={() => setIsStreamFullscreen(true)} 
                      className="theater-btn px-4 py-1.5 bg-zinc-800 border border-zinc-700 text-white text-xs font-bold rounded-lg transition hover:bg-zinc-700"
                    >
                      📺 Full Screen (Show Cams)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cinema Couch Webcams */}
          <div className="cinema-couch-webcams">
            {activeCams.map((tile) => (
              <div key={tile.uid} className="couch-tile">
                {tile.type === 'local'
                  ? <VideoTile uid={tile.uid} type="local" agora={agora} flexGrow={1} onResizeStart={() => {}} onDoubleClick={() => {}} isStrip popoutActive={popoutActive} />
                  : <VideoTile uid={tile.uid} type="remote" user={tile.user} flexGrow={1} onResizeStart={() => {}} onDoubleClick={() => {}} isStrip popoutActive={popoutActive} />
                }
              </div>
            ))}
          </div>

          {/* Theater Auditorium Seats (3D Layered SVG Seats) */}
          <div className="theater-seats-auditorium">
            <div className="seats-row back-row">
              {[...Array(10)].map((_, i) => <TheaterSeat key={i} color="#7f1d1d" />)}
            </div>
            <div className="seats-row middle-row">
              {[...Array(9)].map((_, i) => <TheaterSeat key={i} color="#b91c1c" />)}
            </div>
            <div className="seats-row front-row">
              {[...Array(8)].map((_, i) => <TheaterSeat key={i} color="#dc2626" />)}
            </div>
          </div>
        </div>
      )}

      {/* Stream Full Screen Mode Overlay Portal */}
      {isStreamFullscreen && activeStream && (
        <div className="cinema-fullscreen-overlay">
          <div className="fullscreen-stream-container">
            {activeStream.type === 'local' ? (
              <ScreenTile getLocalScreenTrack={agora.getLocalScreenTrack} />
            ) : (
              <VideoTile uid={activeStream.uid} type={activeStream.type} agora={activeStream.agora || agora} user={activeStream.user} flexGrow={1} onResizeStart={() => {}} onDoubleClick={() => {}} popoutActive={popoutActive} />
            )}
          </div>
          
          {/* Subtitles Overlay */}
          {Object.values(subtitles).some(Boolean) && (
            <div className="cinema-fullscreen-subtitles">
              {Object.entries(subtitles).map(([uid, text]) => text && (
                <div key={uid} className="caption-line">{text}</div>
              ))}
            </div>
          )}

          {/* Fullscreen Couch Webcams (only showing people whose cameras are turned on) */}
          <div className="fullscreen-couch-webcams">
            {activeCams.map((tile) => (
              <div key={tile.uid} className="couch-tile">
                {tile.type === 'local'
                  ? <VideoTile uid={tile.uid} type="local" agora={agora} flexGrow={1} onResizeStart={() => {}} onDoubleClick={() => {}} isStrip popoutActive={popoutActive} />
                  : <VideoTile uid={tile.uid} type="remote" user={tile.user} flexGrow={1} onResizeStart={() => {}} onDoubleClick={() => {}} isStrip popoutActive={popoutActive} />
                }
              </div>
            ))}
          </div>

          <button 
            onClick={() => setIsStreamFullscreen(false)} 
            className="fullscreen-exit-btn"
          >
            Exit Fullscreen
          </button>
        </div>
      )}

      {/* Render traditional video layouts only when not in movie party cinema mode or tree study mode */}
      {currentChannel !== 'movie-party' && currentChannel !== 'study-room' && (
        <>
          {/* Focus mode: one big tile + strip */}
          {isFocused && focusedTile && (
            <div className="video-grid focus-mode">
              <div className="focus-main">
                {renderTile(focusedTile, orderedTiles.indexOf(focusedTile), 'main')}
              </div>
              {stripTiles.length > 0 && (
                <div className="focus-strip">
                  {stripTiles.map((t) => renderTile(t, orderedTiles.indexOf(t), 'strip'))}
                </div>
              )}
            </div>
          )}

          {/* Normal grid mode — flex rows */}
          {!isFocused && !gameActive && (
            <div className={`video-grid relative ${agora.screenShareEnabled ? 'has-screen' : ''}`}>

              {agora.screenShareEnabled && (
                <div className="screen-share-container">
                  <ScreenTile key="screen-tile" getLocalScreenTrack={agora.getLocalScreenTrack} />
                </div>
              )}

              <div className={`tiles-flex ${agora.screenShareEnabled ? 'with-screen' : ''}`}>
                {rows.map((row, ri) => (
                  <div key={ri} className="tiles-row">
                    {row.map((tile, ci) => renderTile(tile, ri * effectiveCols + ci, 'main'))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Game mode */}
          {gameActive && (
            <div className="game-mode">
              <div className="game-video-strip">
                {orderedTiles.map((tile, idx) => (
                  <div key={tile.uid} className="video-tile strip-tile compact">
                    {tile.type === 'local'
                      ? <VideoTile uid={tile.uid} type="local" agora={agora} flexGrow={1} onResizeStart={() => {}} onDoubleClick={() => {}} isStrip popoutActive={popoutActive} />
                      : <VideoTile uid={tile.uid} type="remote" user={tile.user} flexGrow={1} onResizeStart={() => {}} onDoubleClick={() => {}} isStrip popoutActive={popoutActive} />
                    }
                  </div>
                ))}
              </div>

              {!selectedGame ? (
                /* Choose Game Landing Screen */
                <div className="game-select-landing">
                  <h3>CHOOSE A MULTIPLAYER SQUAD GAME</h3>
                  <div className="game-select-grid">
                    <div 
                      onClick={() => setSelectedGame('wordle')}
                      className="game-select-card"
                    >
                      <span className="game-card-icon">🔤</span>
                      <span className="game-card-title">WORDLE</span>
                      <p>Single guess challenge</p>
                    </div>

                    <div 
                      onClick={() => setSelectedGame('chess')}
                      className="game-select-card"
                    >
                      <span className="game-card-icon">♟️</span>
                      <span className="game-card-title">CHESS</span>
                      <p>Collaborative Chess</p>
                    </div>

                    <div 
                      onClick={() => setSelectedGame('crossword')}
                      className="game-select-card"
                    >
                      <span className="game-card-icon">🧩</span>
                      <span className="game-card-title">CROSSWORD</span>
                      <p>Cooperative Crossword</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Active Game Panel with Quit/End state */
                <div className="active-game-panel">
                  <div className="active-game-header flex items-center justify-between px-3 py-2 border-b border-white/10">
                    <span className="active-game-title text-[10px] font-bold tracking-wider text-purple-400">
                      CURRENT GAME: {selectedGame.toUpperCase()}
                    </span>
                    <button 
                      onClick={() => setSelectedGame(null)}
                      className="end-active-game-btn"
                    >
                      Leave Game & Return to Menu
                    </button>
                  </div>
                  <div className="game-panel flex-1 min-h-0 overflow-hidden">
                    {selectedGame === 'wordle' && <WordleGame />}
                    {selectedGame === 'chess' && <ChessGame sendCustomStreamMessage={agora.sendCustomStreamMessage} />}
                    {selectedGame === 'crossword' && <CrosswordGame sendCustomStreamMessage={agora.sendCustomStreamMessage} />}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Resizable Control Bar containing the scaled call buttons */}
      {(() => {
        const btnScale = controlBarHeight / 76;
        const scaledBtnStyle = {
          padding: `${Math.max(4, Math.round(8 * btnScale))}px ${Math.max(6, Math.round(14 * btnScale))}px`,
          minWidth: `${Math.max(45, Math.round(60 * btnScale))}px`,
          borderRadius: `calc(var(--r-md) * ${btnScale})`,
        };
        const scaledLabelStyle = {
          fontSize: `${Math.max(8, Math.round(10 * btnScale))}px`,
        };
        const scaledIconSize = Math.max(14, Math.round(20 * btnScale));

        const scaledSelectContainerStyle = {
          padding: `${Math.max(1, Math.round(2 * btnScale))}px ${Math.max(3, Math.round(6 * btnScale))}px`,
          borderRadius: `calc(4px * ${btnScale})`,
          gap: `${Math.max(1, Math.round(2 * btnScale))}px`
        };
        const scaledSelectLabelStyle = {
          fontSize: `${Math.max(7, Math.round(9 * btnScale))}px`,
        };
        const scaledSelectStyle = {
          fontSize: `${Math.max(8, Math.round(11 * btnScale))}px`,
        };

        return (
          <div className="control-bar" style={{ height: `${controlBarHeight}px`, position: 'relative' }}>
            {/* Resize handle at the top edge of the control bar */}
            <div 
              className="control-bar-resize-handle"
              onMouseDown={handleControlResizeMouseDown}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '6px',
                cursor: 'ns-resize',
                zIndex: 20
              }}
            />

            <div className="controls-left">
              <p className="text-muted text-xs" style={{ fontSize: `${Math.max(8, Math.round(12 * btnScale))}px` }}>
                {totalInCall} in call
              </p>
            </div>
            
            <div className="controls-center flex items-center gap-2">
              {/* Audio Input Selection Matrix */}
              <div className="flex flex-col text-zinc-400 bg-black/40 border border-white/5" style={scaledSelectContainerStyle}>
                <label className="tracking-wider" style={scaledSelectLabelStyle}>AUDIO FROM:</label>
                <select 
                  value={window.ccFromLang || "zh-CN"} 
                  onChange={(e) => { window.ccFromLang = e.target.value; if(window.isCcActive) { agora.startSubtitling(agora.localAudioTrack, window.ccFromLang, window.ccToLang || "en"); } }}
                  className="bg-zinc-800 text-white rounded outline-none cursor-pointer"
                  style={scaledSelectStyle}
                >
                  <option value="zh-CN">Chinese (zh-CN)</option>
                  <option value="en-US">English (en-US)</option>
                  <option value="ko">Korean (ko)</option>
                </select>
              </div>

              {/* Translation Subtitle Target Selection Matrix */}
              <div className="flex flex-col text-zinc-400 bg-black/40 border border-white/5" style={scaledSelectContainerStyle}>
                <label className="tracking-wider" style={scaledSelectLabelStyle}>SUBTITLE TO:</label>
                <select 
                  value={window.ccToLang || "en"} 
                  onChange={(e) => { window.ccToLang = e.target.value; if(window.isCcActive) { agora.startSubtitling(agora.localAudioTrack, window.ccFromLang || "zh-CN", window.ccToLang); } }}
                  className="bg-zinc-800 text-white rounded outline-none cursor-pointer"
                  style={scaledSelectStyle}
                >
                  <option value="en">English (en)</option>
                  <option value="zh-CN">Chinese (zh-CN)</option>
                  <option value="ko">Korean (ko)</option>
                </select>
              </div>

              {/* Core Master CC Button Trigger */}
              <button 
                className={`ctrl-btn ${window.isCcActive ? 'active bg-purple-600' : 'off'}`}
                style={scaledBtnStyle}
                onClick={() => {
                  if (!window.isCcActive) {
                    window.isCcActive = true;
                    agora.startSubtitling(agora.localAudioTrack, window.ccFromLang || "zh-CN", window.ccToLang || "en");
                  } else {
                    window.isCcActive = false;
                    agora.stopSubtitling();
                  }
                }} 
                title="Toggle Captions"
              >
                <span className="font-bold tracking-wider" style={{ fontSize: `${Math.max(8, Math.round(11 * btnScale))}px` }}>CC</span>
                <span className="ctrl-label" style={scaledLabelStyle}>{window.isCcActive ? 'Captions On' : 'Captions Off'}</span>
              </button>

              <button 
                className={`ctrl-btn ${agora.micEnabled ? 'active' : 'off'}`}
                style={scaledBtnStyle}
                onClick={agora.toggleMic} 
                title={agora.micEnabled ? 'Mute' : 'Unmute'}
              >
                {agora.micEnabled ? <Mic size={scaledIconSize} /> : <MicOff size={scaledIconSize} />}
                <span className="ctrl-label" style={scaledLabelStyle}>{agora.micEnabled ? 'Mic' : 'Muted'}</span>
              </button>
              
              <button 
                className={`ctrl-btn ${agora.cameraEnabled ? 'active' : ''}`}
                style={scaledBtnStyle}
                onClick={agora.toggleCamera} 
                title={agora.cameraEnabled ? 'Camera off' : 'Camera on'}
              >
                {agora.cameraEnabled ? <Video size={scaledIconSize} /> : <VideoOff size={scaledIconSize} />}
                <span className="ctrl-label" style={scaledLabelStyle}>Camera</span>
              </button>
              
              <button 
                className={`ctrl-btn ${agora.screenShareEnabled ? 'active' : ''}`}
                style={scaledBtnStyle}
                onClick={agora.toggleScreenShare} 
                title={agora.screenShareEnabled ? 'Stop sharing' : 'Share screen'}
              >
                {agora.screenShareEnabled ? <MonitorOff size={scaledIconSize} /> : <Monitor size={scaledIconSize} />}
                <span className="ctrl-label" style={scaledLabelStyle}>Share</span>
              </button>
              
              {currentChannel === 'gaming' && (
                <button
                  className={`ctrl-btn ${gameActive ? 'active' : ''}`}
                  style={scaledBtnStyle}
                  onClick={gameActive ? endGame : startGame}
                  title={gameActive ? 'End game' : 'Start Game'}
                >
                  <Gamepad2 size={scaledIconSize} />
                  <span className="ctrl-label" style={scaledLabelStyle}>{gameActive ? 'End' : 'Game'}</span>
                </button>
              )}

              {currentChannel === 'study-room' && (
                <button 
                  className={`ctrl-btn ambient-btn ${naturePlaying ? 'active bg-emerald-600 border border-emerald-500' : 'off'}`}
                  style={scaledBtnStyle}
                  onClick={toggleNatureSounds}
                  title="Toggle Forest Ambient Noise"
                >
                  <Volume2 size={scaledIconSize} />
                  <span className="ctrl-label" style={scaledLabelStyle}>{naturePlaying ? 'Rain On' : 'Ambient'}</span>
                </button>
              )}

              {currentChannel === 'chill-beats' && (
                <button 
                  className={`ctrl-btn ambient-btn ${lofiPlaying ? 'active bg-pink-600 border border-pink-500' : 'off'}`}
                  style={scaledBtnStyle}
                  onClick={toggleLofiBeats}
                  title="Toggle Cozy Lofi Beats"
                >
                  <Volume2 size={scaledIconSize} />
                  <span className="ctrl-label" style={scaledLabelStyle}>{lofiPlaying ? 'Lofi On' : 'Ambient'}</span>
                </button>
              )}
              
              <button className="ctrl-btn end-call" style={scaledBtnStyle} onClick={handleLeave} title="Leave">
                <PhoneOff size={scaledIconSize} />
                <span className="ctrl-label" style={scaledLabelStyle}>Leave</span>
              </button>
            </div>
            
            <div className="controls-right">
              <button 
                className="ctrl-btn-sm" 
                onClick={() => openSettings('audio')} 
                title="Settings"
                style={{
                  width: `${Math.max(24, Math.round(36 * btnScale))}px`,
                  height: `${Math.max(24, Math.round(36 * btnScale))}px`,
                  borderRadius: `calc(var(--r-md) * ${btnScale})`,
                }}
              >
                <Settings size={Math.max(12, Math.round(16 * btnScale))} />
              </button>
            </div>
          </div>
        );
      })()}

      {agora.error && <div className="error-toast" role="alert">⚠ {agora.error}</div>}
    </div>
  );
}