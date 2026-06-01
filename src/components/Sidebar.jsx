import { Hash, Mic, MicOff, Settings, Users, Volume2, Wifi } from 'lucide-react';
import { useAppStore } from '../contexts/store';
import './Sidebar.css';

const STATUS_COLORS = { online: '#3dd68c', idle: '#f5c842', dnd: '#f04d4d', offline: '#5c5f7a' };

function ChannelItem({ channel, active, onJoin }) {
  return (
    <button
      className={`channel-item ${active ? 'active' : ''}`}
      onClick={() => onJoin(channel.id, channel.name)}
    >
      {channel.type === 'voice' ? (
        <Volume2 size={15} aria-hidden />
      ) : (
        <Hash size={15} aria-hidden />
      )}
      <span className="channel-name">{channel.name}</span>
      {channel.members > 0 && (
        <span className="channel-count">
          <Users size={11} aria-hidden />
          {channel.members}
        </span>
      )}
    </button>
  );
}

export function Sidebar({ agora }) {
  const {
    channels, currentChannel, setChannel, setView,
    openSettings, user, channelUsers, currentView,
  } = useAppStore();

  const handleJoinChannel = (id, name) => {
    setChannel(id, name);
    setView('call');
    if (!agora.joined) {
      agora.join(id);
    }
  };

  return (
    <aside className="sidebar">
      {/* Server header */}
      <div className="sidebar-header">
        <div className="server-icon">
          <span className="font-mono">W</span>
        </div>
        <div className="server-info">
          <p className="server-name font-mono">wavelength</p>
          <p className="server-sub text-muted text-xs">
            {agora.connectionState === 'CONNECTED' ? (
              <span className="text-green flex items-center gap-1">
                <Wifi size={10} aria-hidden /> connected
              </span>
            ) : 'college server'}
          </p>
        </div>
      </div>

      {/* Channels */}
      <div className="sidebar-section">
        <p className="section-label">Voice Channels</p>
        {channels.filter(c => c.type === 'voice').map(ch => (
          <ChannelItem
            key={ch.id}
            channel={ch}
            active={currentChannel === ch.id}
            onJoin={handleJoinChannel}
          />
        ))}

        <p className="section-label" style={{ marginTop: 16 }}>Text Channels</p>
        {channels.filter(c => c.type === 'text').map(ch => (
          <ChannelItem
            key={ch.id}
            channel={ch}
            active={currentChannel === ch.id}
            onJoin={handleJoinChannel}
          />
        ))}
      </div>

      {/* Active users in call */}
      {currentView === 'call' && (
        <div className="sidebar-section active-users">
          <p className="section-label">in voice · {currentChannel || 'general'}</p>
          {channelUsers.map(u => (
            <div key={u.uid} className="user-row">
              <div
                className="user-avatar-sm"
                style={{ background: u.color + '33', color: u.color, border: `1px solid ${u.color}44` }}
              >
                {u.avatar}
                {u.speaking && <span className="speaking-ring" />}
              </div>
              <span className="user-name-sm truncate">{u.name}</span>
              {u.muted && <MicOff size={12} className="text-muted" aria-label="muted" />}
              {u.hasVideo && <span className="video-badge text-xs">cam</span>}
            </div>
          ))}
          {/* Local user */}
          <div className="user-row">
            <div className="user-avatar-sm you-avatar">
              {user.avatar}
              {agora.micEnabled && !agora.joined && <span className="speaking-ring" />}
            </div>
            <span className="user-name-sm truncate">{user.name}</span>
            {!agora.micEnabled && <MicOff size={12} className="text-red" aria-label="muted" />}
          </div>
        </div>
      )}

      <div className="sidebar-spacer" />

      {/* User bar */}
      <div className="user-bar">
        <div className="user-bar-avatar">
          <div
            className="status-dot"
            style={{ background: STATUS_COLORS[user.status] }}
            title={user.status}
          />
          <span className="avatar-letter">{user.avatar}</span>
        </div>
        <div className="user-bar-info">
          <p className="font-medium truncate" style={{ fontSize: 13 }}>{user.name}</p>
          <p className="text-muted text-xs">{user.status}</p>
        </div>
        <div className="user-bar-actions">
          {agora.joined ? (
            <button
              className={`icon-btn ${agora.micEnabled ? '' : 'danger'}`}
              onClick={agora.toggleMic}
              title={agora.micEnabled ? 'Mute mic' : 'Unmute mic'}
            >
              {agora.micEnabled ? <Mic size={15} aria-hidden /> : <MicOff size={15} aria-hidden />}
            </button>
          ) : null}
          <button
            className="icon-btn"
            onClick={() => openSettings('audio')}
            title="Settings"
          >
            <Settings size={15} aria-hidden />
          </button>
        </div>
      </div>
    </aside>
  );
}
