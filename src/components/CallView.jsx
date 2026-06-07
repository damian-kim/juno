import { useEffect, useRef } from 'react';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Settings
} from 'lucide-react';
import { useAppStore } from '../contexts/store';
import './CallView.css';

function NetQuality({ quality }) {
  if (!quality) return null;
  const up = quality.uplinkNetworkQuality;
  const bars = up <= 1 ? 4 : up <= 2 ? 3 : up <= 3 ? 2 : 1;
  const color = bars >= 3 ? 'var(--c-green)' : bars === 2 ? 'var(--c-yellow)' : 'var(--c-red)';
  return (
    <div className="net-quality" title={`Network quality: ${bars}/4`} aria-label={`Network quality ${bars} of 4 bars`}>
      {[1,2,3,4].map(i => (
        <span key={i} className="net-bar" style={{ opacity: i <= bars ? 1 : 0.2, background: color, height: `${i * 4 + 4}px` }} />
      ))}
    </div>
  );
}

function VideoTile({ user, isLocal, videoRef, speaking }) {
  const containerRef = useRef(null);

  useEffect(() => {
    // Only handle remote tracks here — local video is handled by CallView
    if (!isLocal && user.hasVideo && user.videoTrack && containerRef.current) {
      user.videoTrack.play(containerRef.current);
    }
    return () => {
      // Only stop remote tracks on cleanup, never touch local
      if (!isLocal) {
        user.videoTrack?.stop?.();
      }
    };
  }, [user.uid, user.hasVideo, user.videoTrack, isLocal]);

  return (
    <div className={`video-tile ${speaking ? 'speaking' : ''}`}>
      <div className="video-surface" ref={!isLocal ? containerRef : videoRef}>
        {!user.hasVideo && (
          <div className="video-avatar">
            <div
              className="avatar-circle"
              style={{
                background: user.color + '22',
                color: user.color,
                boxShadow: speaking ? `0 0 0 3px ${user.color}` : 'none'
              }}
            >
              {user.avatar}
              {speaking && <span className="tile-speaking-ring" style={{ borderColor: user.color }} />}
            </div>
            <p className="avatar-name">{user.name}</p>
          </div>
        )}
      </div>
      <div className="tile-overlay">
        <div className="tile-info">
          <span className="tile-name">{user.name}{isLocal ? ' (you)' : ''}</span>
          {user.muted && (
            <span className="tile-muted"><MicOff size={12} aria-label="muted" /></span>
          )}
        </div>
        {speaking && (
          <div className="speaking-bars" aria-hidden>
            {[0,1,2].map(i => (
              <span key={i} className="speak-bar" style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScreenTile({ track }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (track && containerRef.current) {
      track.play(containerRef.current);
    }
    return () => {
      track?.stop?.();
    };
  }, [track]);

  return (
    <div className="screen-tile">
      <div className="screen-surface" ref={containerRef} />
      <div className="screen-badge">
        <Monitor size={13} aria-hidden />
        Screen share
      </div>
    </div>
  );
}

export function CallView({ agora }) {
  const { currentChannelName, channelUsers, openSettings, setView, addNotification } = useAppStore();
  const localVideoRef = useRef(null);

  // Play local video into the ref'd element whenever camera turns on
  useEffect(() => {
    if (agora.cameraEnabled && localVideoRef.current && agora.localVideoTrack.current) {
      agora.playLocalVideo(localVideoRef.current);
    }
  }, [agora.cameraEnabled]);

  const handleLeave = () => {
    agora.leave();
    setView('home');
    addNotification('Left the channel');
  };

  const mockLocalUser = {
    uid: 'local',
    name: 'You',
    avatar: 'Y',
    color: '#7c6dfa',
    hasVideo: agora.cameraEnabled,
    muted: !agora.micEnabled,
  };

  const allTiles = [mockLocalUser, ...channelUsers];
  const gridClass =
    allTiles.length <= 1 ? 'grid-1' :
    allTiles.length <= 2 ? 'grid-2' :
    allTiles.length <= 4 ? 'grid-4' : 'grid-many';

  return (
    <div className="call-view">
      {/* Header */}
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
          <button className="header-btn" onClick={() => openSettings('audio')} title="Open settings">
            <Settings size={16} aria-hidden />
          </button>
        </div>
      </div>

      {/* Video grid */}
      <div className={`video-grid ${gridClass}`}>
        {/* Screen share */}
        {agora.screenShareEnabled && (
          <div className="screen-share-container">
            <ScreenTile track={agora.localScreenTrack.current} />
          </div>
        )}

        {/* Video tiles */}
        <div className={`tiles-container ${agora.screenShareEnabled ? 'with-screen' : ''}`}>
          {/* Local tile — videoRef is passed so the surface element is the play target */}
          <VideoTile
            user={mockLocalUser}
            isLocal={true}
            videoRef={localVideoRef}
            speaking={false}
          />
          {/* Remote users */}
          {channelUsers.map(u => (
            <VideoTile
              key={u.uid}
              user={u}
              isLocal={false}
              speaking={u.speaking}
            />
          ))}
        </div>
      </div>

      {/* Control bar */}
      <div className="control-bar">
        <div className="controls-left">
          <p className="text-muted text-xs">
            {channelUsers.length + 1} in call
          </p>
        </div>

        <div className="controls-center">
          <button
            className={`ctrl-btn ${agora.micEnabled ? 'active' : 'off'}`}
            onClick={agora.toggleMic}
            title={agora.micEnabled ? 'Mute microphone' : 'Unmute microphone'}
            aria-pressed={!agora.micEnabled}
          >
            {agora.micEnabled ? <Mic size={20} aria-hidden /> : <MicOff size={20} aria-hidden />}
            <span className="ctrl-label">{agora.micEnabled ? 'Mic' : 'Muted'}</span>
          </button>

          <button
            className={`ctrl-btn ${agora.cameraEnabled ? 'active' : ''}`}
            onClick={agora.toggleCamera}
            title={agora.cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
            aria-pressed={agora.cameraEnabled}
          >
            {agora.cameraEnabled ? <Video size={20} aria-hidden /> : <VideoOff size={20} aria-hidden />}
            <span className="ctrl-label">Camera</span>
          </button>

          <button
            className={`ctrl-btn ${agora.screenShareEnabled ? 'active' : ''}`}
            onClick={agora.toggleScreenShare}
            title={agora.screenShareEnabled ? 'Stop sharing' : 'Share screen'}
            aria-pressed={agora.screenShareEnabled}
          >
            {agora.screenShareEnabled ? <MonitorOff size={20} aria-hidden /> : <Monitor size={20} aria-hidden />}
            <span className="ctrl-label">Share</span>
          </button>

          <button
            className="ctrl-btn end-call"
            onClick={handleLeave}
            title="Leave channel"
          >
            <PhoneOff size={20} aria-hidden />
            <span className="ctrl-label">Leave</span>
          </button>
        </div>

        <div className="controls-right">
          <button
            className="ctrl-btn-sm"
            onClick={() => openSettings('audio')}
            title="Audio settings"
          >
            <Settings size={16} aria-hidden />
          </button>
        </div>
      </div>

      {/* Error toast */}
      {agora.error && (
        <div className="error-toast" role="alert">
          ⚠ {agora.error}
        </div>
      )}
    </div>
  );
}