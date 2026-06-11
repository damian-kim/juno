import { useEffect, useRef, useState } from 'react';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Settings
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
function LocalVideoTile({ agora }) {
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
    <div className="video-tile">
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

function RemoteVideoTile({ user }) {
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
    <div className="video-tile">
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
// Uses a raw <video> element with srcObject instead of Agora's div-injection.
// This survives Chrome's tab throttling when you switch away from the source tab.
//
// FIX for "Cannot read .current of undefined":
// We capture the MediaStreamTrack synchronously into a local variable BEFORE
// any async operation. The ref (videoRef) may become null when React unmounts
// this component (because screenShareEnabled flipped false), so every access
// to videoRef.current is guarded. The cleanup nulls srcObject immediately.
function ScreenTile({ getLocalScreenTrack }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('binding'); // binding | playing | error

  useEffect(() => {
    let attempts = 0;
    let timeoutId = null;
    let isMounted = true;
    // Capture a local reference to the video element at effect time.
    // This stays valid even after React nulls videoRef.current on unmount.
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

      // getMediaStreamTrack() returns the raw browser MediaStreamTrack.
      // We wrap it in a fresh MediaStream and assign it as srcObject —
      // this gives us a video pipeline that Chrome doesn't throttle
      // when the shared tab loses focus.
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
      // Guard: videoEl is our local copy, not videoRef.current which may be null
      if (videoEl) videoEl.srcObject = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Empty deps: this tile is mounted fresh for each screen share session (key prop
  // on the parent), so we only need to bind once on mount.

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

// ─── CallView ──────────────────────────────────────────────────────────────────
export function CallView({ agora }) {
  const { currentChannelName, openSettings, setView, addNotification } = useAppStore();

  const handleLeave = () => {
    agora.leave();
    setView('home');
    addNotification('Left the channel');
  };

  const remoteUsers = agora.remoteUsers;
  const totalInCall = remoteUsers.length + 1;
  const gridClass =
    totalInCall <= 1 ? 'grid-1' :
    totalInCall <= 2 ? 'grid-2' :
    totalInCall <= 4 ? 'grid-4' : 'grid-many';

  return (
    <div className="call-view">
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
          <button className="header-btn" onClick={() => openSettings('audio')} title="Settings">
            <Settings size={16} aria-hidden />
          </button>
        </div>
      </div>

      <div className={`video-grid ${gridClass} ${agora.screenShareEnabled ? 'has-screen' : ''}`}>
        {agora.screenShareEnabled && (
          <div className="screen-share-container">
            {/* Stable key = same component instance across re-renders.
                A fresh mount happens naturally when screenShareEnabled goes
                false→true because the whole container unmounts with it. */}
            <ScreenTile
              key="screen-tile"
              getLocalScreenTrack={agora.getLocalScreenTrack}
            />
          </div>
        )}

        <div className={`tiles-container ${agora.screenShareEnabled ? 'with-screen' : ''}`}>
          <LocalVideoTile agora={agora} />
          {remoteUsers.map(u => (
            <RemoteVideoTile key={u.uid} user={u} />
          ))}
        </div>
      </div>

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