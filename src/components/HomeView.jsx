import { Mic, Monitor, Users, Video, Zap } from 'lucide-react';
import { useAppStore } from '../contexts/store';
import './HomeView.css';

const FEATURE_CARDS = [
  { icon: Mic,     title: 'Voice calls',    desc: 'Crystal clear audio with noise suppression', color: 'var(--c-accent)' },
  { icon: Video,   title: 'Video calls',    desc: 'HD video up to 1080p with virtual backgrounds', color: 'var(--c-green)' },
  { icon: Monitor, title: 'Screen share',   desc: 'Share your screen or a specific window', color: 'var(--c-blue)' },
  { icon: Zap,     title: 'Low latency',    desc: 'Powered by Agora for sub-100ms audio', color: 'var(--c-yellow)' },
];

export function HomeView({ agora }) {
  const { channels, setChannel, setView, addNotification } = useAppStore();
  const voiceChannels = channels.filter(c => c.type === 'voice');

  const handleJoin = async (channel) => {
    setChannel(channel.id, channel.name);
    setView('call');
    try {
      await agora.join(channel.id);
      addNotification(`Joined #${channel.name}`);
    } catch {
      addNotification('Failed to join — check your App ID');
    }
  };

  return (
    <div className="home-view">
      {/* Hero */}
      <div className="home-hero">
        <div className="hero-glow" aria-hidden />
        <div className="hero-content">
          <div className="hero-badge">
            <Mic size={13} aria-hidden />
            Powered by Agora RTC
          </div>
          <h1 className="hero-title font-mono">
            talk loud,<br />study together
          </h1>
          <p className="hero-sub">
            Voice & video calling for your squad. No bloat, just vibes.
          </p>
        </div>

        {/* Feature cards */}
        <div className="feature-grid">
          {FEATURE_CARDS.map(card => (
            <div key={card.title} className="feature-card">
              <div className="feature-icon" style={{ color: card.color, background: card.color + '1a' }}>
                <card.icon size={18} aria-hidden />
              </div>
              <div>
                <p className="feature-title">{card.title}</p>
                <p className="feature-desc">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Channels quick-join */}
      <div className="channel-list-section">
        <div className="section-header">
          <Users size={16} aria-hidden />
          <span>jump into a channel</span>
        </div>

        {voiceChannels.map(ch => (
          <div key={ch.id} className="channel-row">
            <div className="channel-row-left">
              <div className="channel-dot" />
              <div>
                <p className="channel-row-name font-mono">#{ch.name}</p>
                {ch.members > 0 ? (
                  <p className="channel-row-meta">
                    <span className="text-green">● {ch.members} online</span>
                  </p>
                ) : (
                  <p className="channel-row-meta text-muted">empty · be the first</p>
                )}
              </div>
            </div>
            <button className="join-btn" onClick={() => handleJoin(ch)}>
              Join
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
