import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Settings, Maximize, Minimize, Grid2X2,
  Focus, ExternalLink, Columns3, X
} from 'lucide-react';
import { useAppStore } from '../contexts/store';
import './CallView.css';

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

// ─── Local video tile ──────────────────────────────────────────────────────────
function LocalVideoTile({ agora, isFocused, onDoubleClick }) {
  const videoRef = useRef(null);
  const color = '#7c6dfa';

  useEffect(() => {
    if (!agora.cameraEnabled) return;

    let attempts = 0;
    let timeoutId = null;
    let isMounted = true;

    const tryPlay = () => {
      if (!isMounted) return;
      const track = agora.localVideoTrack?.current;
      if (track && videoRef.current) {
        try { track.play(videoRef.current); } catch (e) { console.warn('Local video play:', e); }
        return;
      }
      if (attempts++ < 30) timeoutId = setTimeout(tryPlay, 100);
    };
    tryPlay();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [agora.cameraEnabled, agora.localVideoTrack]);

  return (
    <div className={`video-tile ${isFocused ? 'focused' : ''}`} onDoubleClick={onDoubleClick}>
      <video ref={videoRef} className="video-el" autoPlay muted playsInline
        style={{ display: agora.cameraEnabled ? 'block' : 'none' }} />
      {!agora.cameraEnabled && (
        <div className="video-avatar">
          <div className="avatar-circle" style={{ background: color + '22', color }}>Y</div>
          <p className="avatar-name">You</p>
        </div>
      )}
      <div className="tile-overlay">
        <div className="tile-info">
          <span className="tile-name">You</span>
          {!agora.micEnabled && <span className="tile-muted"><MicOff size={12} /></span>}
        </div>
      </div>
    </div>
  );
}

// ─── Remote video tile ─────────────────────────────────────────────────────────
const TILE_COLORS = ['#3dd68c', '#00d2ff', '#f04d87', '#f5a623', '#7c6dfa', '#4d9ef0'];
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return h;
}

function RemoteVideoTile({ user, isFocused, onDoubleClick }) {
  const videoRef = useRef(null);
  const color = TILE_COLORS[Math.abs(hashCode(String(user.uid))) % TILE_COLORS.length];
  const label = String(user.uid).slice(0, 6);

  useEffect(() => {
    if (user.hasVideo && user.videoTrack && videoRef.current) {
      try { user.videoTrack.play(videoRef.current); } catch (e) { console.warn('Remote video play:', e); }
    }
    return () => {
      try { user.videoTrack?.stop?.(); } catch {}
    };
  }, [user.uid, user.hasVideo, user.videoTrack]);

  return (
    <div className={`video-tile ${isFocused ? 'focused' : ''}`} onDoubleClick={onDoubleClick}>
      <video ref={videoRef} className="video-el" autoPlay playsInline
        style={{ display: user.hasVideo ? 'block' : 'none' }} />
      {!user.hasVideo && (
        <div className="video-avatar">
          <div className="avatar-circle" style={{ background: color + '22', color }}>
            {label.slice(0, 2).toUpperCase()}
          </div>
          <p className="avatar-name">User {label}</p>
        </div>
      )}
      <div className="tile-overlay">
        <div className="tile-info">
          <span className="tile-name">User {label}</span>
          {!user.hasAudio && <span className="tile-muted"><MicOff size={12} /></span>}
        </div>
      </div>
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

      const agoraTrack = typeof getLocalScreenTrack === 'function'
        ? getLocalScreenTrack()
        : null;

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
        .catch(e => {
          console.warn('Screen video play blocked:', e);
          if (isMounted) setStatus('error');
        });
    };

    tryBind();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (videoEl) videoEl.srcObject = null;
    };
  }, []);

  return (
    <div className="screen-tile">
      <video
        ref={videoRef}
        className="screen-video-el"
        autoPlay
        muted
        playsInline
        style={{ display: status === 'playing' ? 'block' : 'none' }}
      />
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
    { val: 1, label: '1', icon: null },
    { val: 2, label: '2', icon: null },
    { val: 3, label: '3', icon: null },
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

// ─── CallView ──────────────────────────────────────────────────────────────────
export function CallView({ agora }) {
  const {
    currentChannelName, openSettings, setView, addNotification,
    gridColumns, setGridColumns, focusedUser, setFocusedUser, clearFocus,
    tileOrder, setTileOrder, swapTiles, popoutActive, setPopoutActive,
  } = useAppStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const callViewRef = useRef(null);
  const popoutRef = useRef(null);

  const handleLeave = () => {
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

  // Apply tile order (swap positions)
  const orderedTiles = tileOrder.length === allTiles.length
    ? tileOrder.map(i => allTiles[i]).filter(Boolean)
    : allTiles;

  // Initialize tile order when tiles change
  useEffect(() => {
    const newOrder = allTiles.map((_, i) => i);
    if (tileOrder.length !== allTiles.length) {
      setTileOrder(newOrder);
    }
  }, [allTiles.length]);

  const totalInCall = remoteUsers.length + 1;

  // Grid columns logic
  const effectiveCols = gridColumns === 'auto'
    ? (totalInCall <= 1 ? 1 : totalInCall <= 2 ? 2 : totalInCall <= 4 ? 2 : 3)
    : gridColumns;

  const isFocused = focusedUser !== null;
  const focusedTile = isFocused ? orderedTiles.find((t, i) => {
    const focusIdx = orderedTiles.findIndex(t2 => {
      if (focusedUser === '__local__') return t2.uid === '__local__';
      return String(t2.uid) === String(focusedUser);
    });
    return i === focusIdx;
  }) : null;
  const stripTiles = isFocused ? orderedTiles.filter(t => t.uid !== focusedUser) : [];

  // Drag handlers
  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragIdx(prev => prev !== null ? prev : null); setDragOverIdx(idx); };
  const handleDrop = (idx) => {
    if (dragIdx !== null && dragIdx !== idx) {
      swapTiles(dragIdx, idx);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

  // Focus handler
  const handleFocusToggle = (uid) => {
    if (focusedUser === uid) {
      clearFocus();
    } else {
      setFocusedUser(uid);
    }
  };

  // Popout
  const handlePopout = useCallback(async () => {
    if (popoutActive) return;

    try {
      // Try Document PiP API first (Chrome 116+)
      if (documentPictureInPicture && typeof documentPictureInPicture.requestWindow === 'function') {
        const pipWindow = await documentPictureInPicture.requestWindow({ width: 420, height: 320 });
        popoutRef.current = pipWindow;

        pipWindow.document.title = 'Juno — Call Popout';
        pipWindow.document.body.style.cssText = `
          margin:0; padding:8px; background:#0e0f14; color:#e8e9f0;
          font-family:system-ui,sans-serif; font-size:13px;
          display:flex; flex-direction:column; gap:6px; height:100vh;
          box-sizing:border-box; overflow:hidden;
        `;

        // Build a minimal popout UI
        const renderPopout = () => {
          const state = useAppStore.getState();
          const users = agora.remoteUsers;
          const pipDoc = popoutRef.current?.document;
          if (!pipDoc) return;

          pipDoc.body.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #2a2c3a;margin-bottom:6px;">
              <span style="color:#7c6dfa;font-weight:700;font-size:13px">#${state.currentChannelName}</span>
              <span style="color:#9496b0;font-size:11px;margin-left:auto">${users.length + 1} in call</span>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;flex:1;overflow:auto;">
              <div style="flex:1;min-width:80px;aspect-ratio:16/10;background:#13141b;border-radius:8px;border:1px solid #2a2c3a;display:flex;align-items:center;justify-content:center;">
                <span style="color:#7c6dfa;font-size:18px;font-weight:600">Y</span>
              </div>
              ${users.map(u => `
                <div style="flex:1;min-width:80px;aspect-ratio:16/10;background:#13141b;border-radius:8px;border:1px solid #2a2c3a;display:flex;align-items:center;justify-content:center;">
                  <span style="color:#3dd68c;font-size:18px;font-weight:600">${String(u.uid).slice(0,2).toUpperCase()}</span>
                </div>
              `).join('')}
            </div>
            <div style="display:flex;gap:6px;justify-content:center;padding-top:4px;">
              <button id="pip-mic" style="padding:6px 12px;border-radius:6px;border:1px solid #2a2c3a;background:${state.micEnabled ? '#1a1b24' : '#f04d4d22'};color:${state.micEnabled ? '#e8e9f0' : '#f04d4d'};cursor:pointer;font-size:12px;">
                ${state.micEnabled ? 'Mic On' : 'Muted'}
              </button>
              <button id="pip-leave" style="padding:6px 12px;border-radius:6px;border:1px solid #f04d4d44;background:#f04d4d22;color:#f04d4d;cursor:pointer;font-size:12px;">
                Leave
              </button>
            </div>
          `;

          // Wire up buttons
          const micBtn = pipDoc.getElementById('pip-mic');
          const leaveBtn = pipDoc.getElementById('pip-leave');
          if (micBtn) micBtn.onclick = () => { agora.toggleMic(); setTimeout(renderPopout, 100); };
          if (leaveBtn) leaveBtn.onclick = () => { handleLeave(); pipWindow.close(); };
        };

        renderPopout();
        // Refresh popout periodically
        const interval = setInterval(renderPopout, 2000);
        setPopoutActive(true);

        pipWindow.addEventListener('pagehide', () => {
          clearInterval(interval);
          popoutRef.current = null;
          setPopoutActive(false);
        });

        return;
      }

      // Fallback: window.open
      const w = window.open('', 'juno-popout', 'width=420,height=320');
      if (w) {
        w.document.title = 'Juno — Call Popout';
        w.document.body.style.cssText = `
          margin:0; padding:16px; background:#0e0f14; color:#e8e9f0;
          font-family:system-ui,sans-serif; font-size:14px;
          display:flex; align-items:center; justify-content:center;
        `;
        w.document.body.innerHTML = '<p>Popout window active — switch tabs to see overlay.</p>';
        setPopoutActive(true);
        w.addEventListener('beforeunload', () => setPopoutActive(false));
      }
    } catch (err) {
      console.warn('Popout failed:', err);
      addNotification('Popout not supported in this browser');
    }
  }, [popoutActive, agora, addNotification]);

  // Close popout
  const closePopout = useCallback(() => {
    if (popoutRef.current) {
      try { popoutRef.current.close(); } catch {}
      popoutRef.current = null;
    }
    setPopoutActive(false);
  }, []);

  // Cleanup popout on leave
  useEffect(() => {
    return () => { closePopout(); };
  }, []);

  // Render a tile with drag support
  const renderTile = (tile, idx, variant = 'main') => {
    const uid = tile.uid;
    const isTileFocused = focusedUser === uid;
    const tileClasses = [
      'video-tile',
      isTileFocused ? 'focused' : '',
      dragIdx === idx ? 'dragging' : '',
      dragOverIdx === idx ? 'drag-over' : '',
      variant === 'strip' ? 'strip-tile' : '',
    ].filter(Boolean).join(' ');

    const commonDrag = {
      draggable: true,
      onDragStart: () => handleDragStart(idx),
      onDragOver: (e) => handleDragOver(e, idx),
      onDrop: () => handleDrop(idx),
      onDragEnd: handleDragEnd,
    };

    if (tile.type === 'local') {
      return (
        <div key={uid} {...commonDrag} className={tileClasses}>
          <div className="tile-drag-handle" />
          <LocalVideoTileInner agora={tile.agora} onDoubleClick={() => handleFocusToggle(uid)} />
        </div>
      );
    }

    return (
      <div key={uid} {...commonDrag} className={tileClasses}>
        <div className="tile-drag-handle" />
        <RemoteVideoTileInner user={tile.user} onDoubleClick={() => handleFocusToggle(uid)} />
      </div>
    );
  };

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
              {stripTiles.map((t, i) => renderTile(t, orderedTiles.indexOf(t), 'strip'))}
            </div>
          )}
        </div>
      )}

      {/* Normal grid mode */}
      {!isFocused && (
        <div className={`video-grid ${agora.screenShareEnabled ? 'has-screen' : ''}`}>
          {agora.screenShareEnabled && (
            <div className="screen-share-container">
              <ScreenTile
                key="screen-tile"
                getLocalScreenTrack={agora.getLocalScreenTrack}
              />
            </div>
          )}

          <div
            className={`tiles-container ${agora.screenShareEnabled ? 'with-screen' : ''}`}
            style={{
              gridTemplateColumns: agora.screenShareEnabled
                ? undefined
                : `repeat(${effectiveCols}, 1fr)`,
            }}
          >
            {orderedTiles.map((tile, idx) => renderTile(tile, idx, 'main'))}
          </div>
        </div>
      )}

      <div className="control-bar">
        <div className="controls-left">
          <p className="text-muted text-xs">{totalInCall} in call</p>
        </div>
        <div className="controls-center">
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

// Inner tile components (used inside draggable wrappers)
function LocalVideoTileInner({ agora, onDoubleClick }) {
  const videoRef = useRef(null);
  const color = '#7c6dfa';

  useEffect(() => {
    if (!agora.cameraEnabled) return;
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
  }, [agora.cameraEnabled, agora.localVideoTrack]);

  return (
    <>
      <video ref={videoRef} className="video-el" autoPlay muted playsInline
        style={{ display: agora.cameraEnabled ? 'block' : 'none' }} />
      {!agora.cameraEnabled && (
        <div className="video-avatar" onDoubleClick={onDoubleClick}>
          <div className="avatar-circle" style={{ background: color + '22', color }}>Y</div>
          <p className="avatar-name">You</p>
        </div>
      )}
      <div className="tile-overlay" onDoubleClick={onDoubleClick}>
        <div className="tile-info">
          <span className="tile-name">You</span>
          {!agora.micEnabled && <span className="tile-muted"><MicOff size={12} /></span>}
        </div>
      </div>
    </>
  );
}

function RemoteVideoTileInner({ user, onDoubleClick }) {
  const videoRef = useRef(null);
  const color = TILE_COLORS[Math.abs(hashCode(String(user.uid))) % TILE_COLORS.length];
  const label = String(user.uid).slice(0, 6);

  useEffect(() => {
    if (user.hasVideo && user.videoTrack && videoRef.current) {
      try { user.videoTrack.play(videoRef.current); } catch {}
    }
    return () => { try { user.videoTrack?.stop?.(); } catch {} };
  }, [user.uid, user.hasVideo, user.videoTrack]);

  return (
    <>
      <video ref={videoRef} className="video-el" autoPlay playsInline
        style={{ display: user.hasVideo ? 'block' : 'none' }} />
      {!user.hasVideo && (
        <div className="video-avatar" onDoubleClick={onDoubleClick}>
          <div className="avatar-circle" style={{ background: color + '22', color }}>
            {label.slice(0, 2).toUpperCase()}
          </div>
          <p className="avatar-name">User {label}</p>
        </div>
      )}
      <div className="tile-overlay" onDoubleClick={onDoubleClick}>
        <div className="tile-info">
          <span className="tile-name">User {label}</span>
          {!user.hasAudio && <span className="tile-muted"><MicOff size={12} /></span>}
        </div>
      </div>
    </>
  );
}
