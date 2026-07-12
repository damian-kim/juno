import { Mic, Monitor, Users, Video, Zap, Radio, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import { animate } from 'animejs/animation';
import { stagger, random } from 'animejs/utils';
import { useAppStore } from '../contexts/store';
import './HomeView.css';

const FEATURE_CARDS = [
  { icon: Mic,     title: 'Voice calls',    desc: 'Crystal clear audio with noise suppression', color: 'var(--c-accent)' },
  { icon: Video,   title: 'Video calls',    desc: 'HD video up to 1080p with virtual backgrounds', color: 'var(--c-green)' },
  { icon: Monitor, title: 'Screen share',   desc: 'Share your screen or a specific window', color: 'var(--c-blue)' },
  { icon: Zap,     title: 'Low latency',    desc: 'Powered by Agora for sub-100ms audio', color: 'var(--c-yellow)' },
];

const mockAvatars = ['A', 'E', 'N', 'D', 'K', 'S', 'T', 'G', 'Z', 'M'];
const mockColors = ['#3dd68c', '#00d2ff', '#f04d87', '#f5a623', '#7c6dfa', '#4d9ef0'];

export function HomeView({ agora }) {
  const { channels, currentChannel, setChannel, setView, addNotification, user } = useAppStore();
  const voiceChannels = channels.filter(c => c.type === 'voice');

  const [hoveredPodId, setHoveredPodId] = useState(null);
  const [animatingJoinId, setAnimatingJoinId] = useState(null);
  const [offsets, setOffsets] = useState({
    general: { x: 0, y: 0 },
    gaming: { x: 0, y: 0 },
    'study-room': { x: 0, y: 0 },
    'chill-beats': { x: 0, y: 0 }
  });

  const getCoordinates = (channelId) => {
    switch (channelId) {
      case 'general':     return { left: '20%', top: '25%' };
      case 'gaming':      return { left: '80%', top: '25%' };
      case 'study-room':  return { left: '20%', top: '75%' };
      case 'chill-beats': return { left: '80%', top: '75%' };
      default:            return { left: '50%', top: '50%' };
    }
  };

  // Mathematical dynamic organic drift loop (trigonometric sines/cosines)
  useEffect(() => {
    let animFrame;
    const tick = (timestamp) => {
      const t = timestamp * 0.001; // seconds
      setOffsets({
        general: {
          x: Math.sin(t * 0.5) * 1.5 + Math.cos(t * 0.2) * 0.4,
          y: Math.cos(t * 0.6) * 1.5 + Math.sin(t * 0.3) * 0.4
        },
        gaming: {
          x: Math.sin(t * 0.4 + 1.2) * 1.6 + Math.cos(t * 0.3) * 0.3,
          y: Math.cos(t * 0.5 + 2.1) * 1.6 + Math.sin(t * 0.2) * 0.3
        },
        'study-room': {
          x: Math.sin(t * 0.35 + 2.5) * 1.4 + Math.cos(t * 0.4) * 0.4,
          y: Math.cos(t * 0.55 + 1.0) * 1.4 + Math.sin(t * 0.15) * 0.4
        },
        'chill-beats': {
          x: Math.sin(t * 0.45 + 3.1) * 1.5 + Math.cos(t * 0.25) * 0.3,
          y: Math.cos(t * 0.48 + 0.5) * 1.5 + Math.sin(t * 0.35) * 0.4
        }
      });
      animFrame = requestAnimationFrame(tick);
    };
    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  // Mount entrance animations & feature pop-ins
  useEffect(() => {
    // Stagger scale up the voice pod cards
    animate('.voice-pod-node', {
      scale: [0, 1],
      opacity: [0, 1],
      delay: stagger(120),
      duration: 800,
      ease: 'outBack'
    });

    // Stagger the feature cards pop-in
    animate('.feature-card', {
      translateY: [20, 0],
      opacity: [0, 1],
      delay: stagger(100, { start: 100 }),
      duration: 700,
      ease: 'outQuad'
    });
  }, []);

  // Click-to-join handler with smooth state trigger
  const handleSelectChannel = (channel) => {
    if (agora.joined || animatingJoinId) return;

    setAnimatingJoinId(channel.id);
    addNotification(`Connecting to frequency...`);

    // Slide immediately via React state coordinates
    setChannel(channel.id, channel.name);
    setView('call');

    agora.join(channel.id).then(() => {
      addNotification(`Joined #${channel.name}`);
      setAnimatingJoinId(null);
    }).catch(() => {
      addNotification('Failed to join — check your App ID');
      setAnimatingJoinId(null);
      setChannel(null, '');
      setView('home');
    });
  };

  // Mouse-following cursor effect inside Kokonut UI Glass Cards
  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  const defaultCoords = getCoordinates(null);

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
          <h1 className="hero-title">
            TALK LOUD,<br />STUDY TOGETHER
          </h1>
          <p className="hero-sub">
            Voice & video calling for your squad. No bloat, just vibes.
          </p>
        </div>

        {/* Feature cards */}
        <div className="feature-grid">
          {FEATURE_CARDS.map(card => (
            <div key={card.title} className="feature-card" style={{ opacity: 0 }}>
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

      {/* Voice Pods Canvas */}
      <div className="channel-list-section">
        <div className="section-header">
          <Activity size={15} aria-hidden style={{ color: 'var(--c-accent)' }} />
          <span>INTERACTIVE VOICE CANVAS</span>
        </div>

        <div className="voice-canvas">
          <div className="canvas-glow" aria-hidden />

          {/* Rotating Solar Rays Background */}
          <svg className="canvas-sun-rays" viewBox="0 0 100 100" preserveAspectRatio="none">
            {[...Array(16)].map((_, i) => {
              const angle = (i * 22.5 * Math.PI) / 180;
              const x2 = 50 + Math.cos(angle) * 100;
              const y2 = 50 + Math.sin(angle) * 100;
              return (
                <line
                  key={i}
                  x1="50"
                  y1="50"
                  x2={x2}
                  y2={y2}
                  stroke="var(--c-accent)"
                  strokeWidth="0.3"
                  strokeDasharray="2 6"
                  opacity="0.16"
                />
              );
            })}
          </svg>

          {/* Solar Corona Pulsing Rings */}
          <div className="sun-corona-ring ring-1" />
          <div className="sun-corona-ring ring-2" />

          {/* Sun Core Source */}
          <div className="sun-center-source">
            <div className="sun-solar-flares" />
          </div>

          {/* SVG Connection Layer */}
          <svg className="canvas-svg-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
            {voiceChannels.map((ch, idx) => {
              const coords = getCoordinates(ch.id);
              const x2 = parseFloat(coords.left) + (offsets[ch.id]?.x || 0);
              const y2 = parseFloat(coords.top) + (offsets[ch.id]?.y || 0);
              const isHovered = hoveredPodId === ch.id;
              const isJoined = currentChannel === ch.id && agora.joined;
              const isAnimating = animatingJoinId === ch.id;
              
              // Quad bezier curve layout (bending around center 50,50)
              let qx = 50;
              let qy = 50;
              if (x2 < 50) qx = 35;
              else qx = 65;
              if (y2 < 50) qy = 40;
              else qy = 60;

              const pathD = `M 50,50 Q ${qx},${qy} ${x2},${y2}`;
              const active = isHovered || isJoined || isAnimating;

              return (
                <g key={ch.id}>
                  <path
                    d={pathD}
                    stroke={active ? "var(--c-accent)" : "var(--c-border)"}
                    strokeWidth={active ? "2" : "1.2"}
                    strokeDasharray={active ? "none" : "3 4"}
                    fill="none"
                    style={{ transition: 'stroke 0.3s, stroke-width 0.3s, stroke-dasharray 0.3s' }}
                  />
                  {active && (
                    <path
                      d={pathD}
                      stroke="var(--c-accent)"
                      strokeWidth="2.5"
                      fill="none"
                      strokeDasharray="10 30"
                      className="pulse-path"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Voice Pod Nodes */}
          {voiceChannels.map((ch, idx) => {
            const coords = getCoordinates(ch.id);
            const isHovered = hoveredPodId === ch.id;
            const isJoined = currentChannel === ch.id && agora.joined;
            const isAnimating = animatingJoinId === ch.id;
            
            const mockMembers = [];
            const displayLimit = 3;
            const displayMembersCount = Math.min(ch.members, displayLimit);
            for (let i = 0; i < displayMembersCount; i++) {
              mockMembers.push({
                avatar: mockAvatars[(idx * 3 + i) % mockAvatars.length],
                color: mockColors[(idx * 2 + i) % mockColors.length]
              });
            }

            return (
              <div
                key={ch.id}
                className={`voice-pod-node kokonut-card ${isJoined ? 'joined' : ''} ${isHovered ? 'hovered' : ''} ${isAnimating ? 'connecting' : ''}`}
                style={{
                  left: `calc(${coords.left} + ${(offsets[ch.id]?.x || 0)}%)`,
                  top: `calc(${coords.top} + ${(offsets[ch.id]?.y || 0)}%)`,
                  transform: 'translate(-50%, -50%)',
                }}
                onMouseEnter={() => setHoveredPodId(ch.id)}
                onMouseLeave={() => setHoveredPodId(null)}
                onMouseMove={handleMouseMove}
                onClick={() => handleSelectChannel(ch)}
              >
                <div className="kokonut-card-glow-overlay" />
                <div className="pod-content">                  <div className="pod-header">
                    <span className="pod-icon">
                      <Radio size={14} />
                    </span>
                    <span className="pod-name">#{ch.name}</span>
                  </div>

                  {/* Waveform */}
                  <div className="pod-waveform">
                    {[1, 2, 3, 4, 5].map(b => (
                      <span
                        key={b}
                        className={`wave-bar ${ch.members > 0 || isJoined ? 'active' : 'idle'}`}
                        style={{
                          animationDelay: `${b * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Members inside pod */}
                  <div className="pod-members">
                    {ch.members > 0 ? (
                      <div className="members-avatars">
                        {mockMembers.map((m, midx) => (
                          <div
                            key={midx}
                            className="member-dot"
                            style={{
                              background: m.color + '22',
                              color: m.color,
                              border: `1px solid ${m.color}66`,
                            }}
                          >
                            {m.avatar}
                          </div>
                        ))}
                        {ch.members > displayLimit && (
                          <div className="member-dot-more">+{ch.members - displayLimit}</div>
                        )}
                      </div>
                    ) : (
                      <span className="pod-empty-text text-muted">empty freq</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Local User Node */}
          <div
            className={`local-user-node ${animatingJoinId ? 'sliding' : ''} ${agora.joined ? 'docked' : ''}`}
            style={{
              left: agora.joined && currentChannel
                ? `calc(${getCoordinates(currentChannel).left} + ${(offsets[currentChannel]?.x || 0)}%)`
                : (animatingJoinId ? `calc(${getCoordinates(animatingJoinId).left} + ${(offsets[animatingJoinId]?.x || 0)}%)` : defaultCoords.left),
              top: agora.joined && currentChannel
                ? `calc(${getCoordinates(currentChannel).top} + ${(offsets[currentChannel]?.y || 0)}%)`
                : (animatingJoinId ? `calc(${getCoordinates(animatingJoinId).top} + ${(offsets[animatingJoinId]?.y || 0)}%)` : defaultCoords.top),
              transform: 'translate(-50%, -50%)',
              transition: agora.joined
                ? 'none'
                : 'left 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275), top 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275), transform 0.3s, border-color 0.4s, box-shadow 0.4s, opacity 0.3s'
            }}
          >
            <div className="local-user-glow" />
            <div className="local-user-avatar">
              {user.avatar}
            </div>
            {!agora.joined && !animatingJoinId && (
              <span className="local-user-label">you</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


