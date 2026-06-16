import { useEffect, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Settings, Maximize, Minimize, Grid2X2,
  Focus, ExternalLink, Gamepad2, Play, Volume2, VolumeX
} from 'lucide-react';
import { useAppStore } from '../contexts/store';
import { WordleGame } from './WordleGame';
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
function VideoTile({ uid, type, agora, user, flexGrow, onResizeStart, onDoubleClick, isFocused, isStrip, isStreamJoined, onJoinStream, onStreamVolumeChange }) {
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

  useEffect(() => {
    if (!hasVideo || !videoRef.current) return;
    if (isRemoteScreenShare && !isStreamJoined) return;

    if (isLocal) {
      let attempts = 0;
      let timeoutId = null;
      let isMounted = true;
      const tryPlay = () => {
        if (!isMounted) return;
        const track = agora.localVideoTrack?.current;
        if (track && videoRef.current) {
          try { track.play(videoRef.current); } catch {}
          return;
        }
        if (attempts++ < 30) timeoutId = setTimeout(tryPlay, 100);
      };
      tryPlay();
      return () => { isMounted = false; if (timeoutId) clearTimeout(timeoutId); };
    } else {
      if (user?.videoTrack && videoRef.current) {
        try { user.videoTrack.play(videoRef.current); } catch {}
      }
      return () => { try { user?.videoTrack?.stop?.(); } catch {} };
    }
  }, [hasVideo, isLocal, agora, user, isRemoteScreenShare, isStreamJoined]);

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
        style={{ display: hasVideo && (!isRemoteScreenShare || isStreamJoined) ? 'block' : 'none' }}
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

      {!hasVideo && (!isRemoteScreenShare || isStreamJoined) && (
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

  useEffect(() => {
    if (!hasVideo || !videoRef.current) return;

    if (isLocal) {
      let attempts = 0;
      let tid = null;
      let mounted = true;
      const tryPlay = () => {
        if (!mounted) return;
        const track = agora.localVideoTrack?.current;
        if (track && videoRef.current) {
          try { track.play(videoRef.current); } catch {}
          return;
        }
        if (attempts++ < 30) tid = setTimeout(tryPlay, 100);
      };
      tryPlay();
      return () => { mounted = false; if (tid) clearTimeout(tid); };
    } else {
      if (user?.videoTrack && videoRef.current) {
        try { user.videoTrack.play(videoRef.current); } catch {}
      }
      return () => { try { user?.videoTrack?.stop?.(); } catch {} };
    }
  }, [hasVideo, isLocal, agora, user]);

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
    currentChannelName, openSettings, setView, addNotification,
    gridColumns, setGridColumns, focusedUser, setFocusedUser, clearFocus,
    tileOrder, setTileOrder, swapTiles, popoutActive, setPopoutActive,
    gameActive, gameStatus, gamePlayers, startGame, joinGame, endGame,
  } = useAppStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [tileSizes, setTileSizes] = useState({}); // { [uid]: flexGrow }
  const [joinedStreams, setJoinedStreams] = useState(new Set()); // Track joined screen shares
  
  const resizingRef = useRef(null); // { uid, startX, startSize }
  const callViewRef = useRef(null);
  const popoutRef = useRef(null);
  const popoutRootRef = useRef(null);

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

      pipWindow.document.title = 'Juno — Call Popout';
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
        />
      </div>
    );
  };

  // Rows for the flex grid (split orderedTiles into rows of `effectiveCols`)
  const rows = [];
  if (!isFocused && !gameActive) {
    for (let i = 0; i < orderedTiles.length; i += effectiveCols) {
      rows.push(orderedTiles.slice(i, i + effectiveCols));
    }
  }

  return (
    <div className="call-view" ref={callViewRef}>
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
                  ? <VideoTile uid={tile.uid} type="local" agora={agora} flexGrow={1} onResizeStart={() => {}} onDoubleClick={() => {}} isStrip />
                  : <VideoTile uid={tile.uid} type="remote" user={tile.user} flexGrow={1} onResizeStart={() => {}} onDoubleClick={() => {}} isStrip />
                }
              </div>
            ))}
          </div>
          <div className="game-panel"><WordleGame /></div>
        </div>
      )}

      <div className="control-bar">
        <div className="controls-left">
          <p className="text-muted text-xs">{totalInCall} in call</p>
        </div>
        <div className="controls-center flex items-center gap-2">
          {/* Audio Input Selection Matrix */}
          <div className="flex flex-col text-[10px] text-zinc-400 bg-black/40 px-2 py-1 rounded border border-white/5">
            <label className="font-mono">AUDIO FROM:</label>
            <select 
              value={window.ccFromLang || "zh-CN"} 
              onChange={(e) => { window.ccFromLang = e.target.value; if(window.isCcActive) { agora.startSubtitling(agora.localAudioTrack, window.ccFromLang, window.ccToLang || "en"); } }}
              className="bg-zinc-800 text-white text-xs rounded mt-0.5 outline-none cursor-pointer"
            >
              <option value="zh-CN">Chinese (zh-CN)</option>
              <option value="en-US">English (en-US)</option>
              <option value="ko">Korean (ko)</option>
            </select>
          </div>

          {/* Translation Subtitle Target Selection Matrix */}
          <div className="flex flex-col text-[10px] text-zinc-400 bg-black/40 px-2 py-1 rounded border border-white/5">
            <label className="font-mono">SUBTITLE TO:</label>
            <select 
              value={window.ccToLang || "en"} 
              onChange={(e) => { window.ccToLang = e.target.value; if(window.isCcActive) { agora.startSubtitling(agora.localAudioTrack, window.ccFromLang || "zh-CN", window.ccToLang); } }}
              className="bg-zinc-800 text-white text-xs rounded mt-0.5 outline-none cursor-pointer"
            >
              <option value="en">English (en)</option>
              <option value="zh-CN">Chinese (zh-CN)</option>
              <option value="ko">Korean (ko)</option>
            </select>
          </div>

          {/* Core Master CC Button Trigger */}
          <button 
            className={`ctrl-btn ${window.isCcActive ? 'active bg-purple-600' : 'off'}`}
            onClick={() => {
              if (!window.isCcActive) {
                window.isCcActive = true;
                console.log('Subtitle received from server:');
                agora.startSubtitling(agora.localAudioTrack, window.ccFromLang || "zh-CN", window.ccToLang || "en");
              } else {
                window.isCcActive = false;
                agora.stopSubtitling();
              }
            }} 
            title="Toggle Captions"
          >
            <span className="text-xs font-bold font-mono tracking-wider">CC</span>
            <span className="ctrl-label">{window.isCcActive ? 'Captions On' : 'Captions Off'}</span>
          </button>

          <button className={`ctrl-btn ${agora.micEnabled ? 'active' : 'off'}`}
            onClick={agora.toggleMic} title={agora.micEnabled ? 'Mute' : 'Unmute'}>
            {agora.micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
            <span className="ctrl-label">{agora.micEnabled ? 'Mic' : 'Muted'}</span>
          </button>
          <button className={`ctrl-btn ${agora.cameraEnabled ? 'active' : ''}`}
            onClick={agora.toggleCamera} title={agora.cameraEnabled ? 'Camera off' : 'Camera on'}>
            {agora.cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
            <span className="ctrl-label">Camera</span>
          </button>
          <button className={`ctrl-btn ${agora.screenShareEnabled ? 'active' : ''}`}
            onClick={agora.toggleScreenShare} title={agora.screenShareEnabled ? 'Stop sharing' : 'Share screen'}>
            {agora.screenShareEnabled ? <MonitorOff size={20} /> : <Monitor size={20} />}
            <span className="ctrl-label">Share</span>
          </button>
          <button
            className={`ctrl-btn ${gameActive ? 'active' : ''}`}
            onClick={gameActive ? endGame : startGame}
            title={gameActive ? 'End game' : 'Start Wordle'}
          >
            <Gamepad2 size={20} />
            <span className="ctrl-label">{gameActive ? 'End' : 'Game'}</span>
          </button>
          <button className="ctrl-btn end-call" onClick={handleLeave} title="Leave">
            <PhoneOff size={20} />
            <span className="ctrl-label">Leave</span>
          </button>
        </div>
        <div className="controls-right">
          <button className="ctrl-btn-sm" onClick={() => openSettings('audio')} title="Settings">
            <Settings size={16} />
          </button>
        </div>
      </div>

      {agora.error && <div className="error-toast" role="alert">⚠ {agora.error}</div>}
    </div>
  );
}