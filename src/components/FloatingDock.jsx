import { Hash, Mic, MicOff, Settings, Volume2, PhoneOff, Radio, Users } from 'lucide-react';
import { useAppStore } from '../contexts/store';
import './FloatingDock.css';

const STATUS_COLORS = { online: '#3dd68c', idle: '#f5c842', dnd: '#f04d4d', offline: '#8e8880' };

export function FloatingDock({ agora }) {
  const {
    channels, currentChannel, currentChannelName, setChannel, setView,
    openSettings, user, currentView
  } = useAppStore();

  const textChannels = channels.filter(c => c.type === 'text');
  
  const totalVoiceUsers = channels
    .filter(c => c.type === 'voice')
    .reduce((acc, c) => acc + (c.members || 0), 0);

  const handleHomeClick = () => {
    setView('home');
    setChannel(null, '');
  };

  const handleLeaveCall = async () => {
    setView('home');
    setChannel(null, '');
    try {
      await agora.leave();
    } catch (e) {}
  };

  if (currentView === 'call') return null;

  return (
    <div className="floating-dock-wrapper">
      <div className="floating-dock">
        {/* JUNO Logo & Voice Canvas Link */}
        <button
          className={`dock-logo-btn ${currentView === 'home' ? 'active' : ''}`}
          onClick={handleHomeClick}
          title="Go to Voice Canvas"
        >
          <span className="logo-text">JUNO</span>
          {totalVoiceUsers > 0 && (
            <span className="dock-badge">{totalVoiceUsers}</span>
          )}
        </button>

        <div className="dock-divider" />

        {/* Text Channels List */}
        <div className="dock-channels">
          {textChannels.map(ch => {
            const active = currentChannel === ch.id && currentView === 'text';
            return (
              <button
                key={ch.id}
                className={`dock-btn ${active ? 'active' : ''}`}
                onClick={() => {
                  setChannel(ch.id, ch.name);
                  setView('text');
                }}
              >
                <Hash size={13} />
                <span>{ch.name}</span>
              </button>
            );
          })}
        </div>

        {/* Active Call Controls Capsule */}
        {agora.joined && currentChannel && (
          <>
            <div className="dock-divider" />
            <div className="dock-call-capsule">
              <span className="dock-call-indicator pulse-glow-orange" />
              <span className="dock-call-label truncate">
                {currentChannelName.toUpperCase()}
              </span>
              
              <div className="dock-call-actions">
                {currentView !== 'call' && (
                  <button
                    className="dock-call-btn"
                    onClick={() => setView('call')}
                    title="View voice call"
                  >
                    <Users size={12} />
                    <span className="btn-label-sm">VIEW</span>
                  </button>
                )}
                <button
                  className={`dock-call-btn ${!agora.micEnabled ? 'muted' : ''}`}
                  onClick={agora.toggleMic}
                  title={agora.micEnabled ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {agora.micEnabled ? <Mic size={12} /> : <MicOff size={12} />}
                </button>
                <button
                  className="dock-call-btn danger"
                  onClick={handleLeaveCall}
                  title="Leave call"
                >
                  <PhoneOff size={12} />
                </button>
              </div>
            </div>
          </>
        )}

        <div className="dock-divider" />

        {/* User Status Bar & Settings */}
        <div className="dock-user-profile">
          <div className="dock-avatar-wrapper">
            <div
              className="dock-status-dot"
              style={{ background: STATUS_COLORS[user.status] }}
              title={user.status}
            />
            <span className="dock-avatar">{user.avatar}</span>
          </div>
          <span className="dock-username truncate">{user.name}</span>

          <button
            className="dock-action-btn"
            onClick={() => openSettings('audio')}
            title="Settings"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
