import { useEffect, useRef, useState } from 'react';
import {
  X, Mic, Volume2, Video, Palette, Monitor,
  ChevronDown, Check, Sun, Moon, Zap, Layers,
  Type, Circle, Square, Minus
} from 'lucide-react';
import { useAppStore } from '../contexts/store';
import './Settings.css';

const TABS = [
  { id: 'audio',      icon: Mic,     label: 'Audio' },
  { id: 'video',      icon: Video,   label: 'Video' },
  { id: 'background', icon: Monitor, label: 'Backgrounds' },
  { id: 'theme',      icon: Palette, label: 'Theme' },
];

const BACKGROUNDS = [
  { id: 'none',   label: 'None',   preview: '#0e0f14' },
  { id: 'blur',   label: 'Blur',   preview: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' },
  { id: 'office', label: 'Office', preview: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)' },
  { id: 'cafe',   label: 'Café',   preview: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)' },
  { id: 'space',  label: 'Space',  preview: 'linear-gradient(135deg, #0d1117 0%, #1a0533 100%)' },
  { id: 'beach',  label: 'Beach',  preview: 'linear-gradient(135deg, #00b4db 0%, #f7b731 100%)' },
];

const ACCENT_OPTIONS = [
  { id: 'violet', label: 'Violet', color: '#7c6dfa' },
  { id: 'cyan',   label: 'Cyan',   color: '#00d2ff' },
  { id: 'green',  label: 'Green',  color: '#3dd68c' },
  { id: 'rose',   label: 'Rose',   color: '#f04d87' },
  { id: 'amber',  label: 'Amber',  color: '#f5a623' },
];

const COLOR_MODE_OPTIONS = [
  {
    id: 'dark',
    label: 'Dark',
    desc: 'Classic dark room',
    icon: Moon,
    preview: { bg: '#0e0f14', raised: '#13141b', text: '#e8e9f0', border: '#2a2c3a' },
  },
  {
    id: 'light',
    label: 'Light',
    desc: 'Clean & bright',
    icon: Sun,
    preview: { bg: '#f0f1f6', raised: '#ffffff', text: '#1a1b2e', border: '#d0d3e4' },
  },
  {
    id: 'oled',
    label: 'OLED',
    desc: 'True black',
    icon: Zap,
    preview: { bg: '#000000', raised: '#080808', text: '#ffffff', border: '#1e1e1e' },
  },
  {
    id: 'frosted',
    label: 'Frosted',
    desc: 'Glass effect',
    icon: Layers,
    preview: { bg: '#12131a', raised: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.92)', border: 'rgba(255,255,255,0.09)' },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    desc: 'Deep indigo',
    icon: Moon,
    preview: { bg: '#0a0c18', raised: '#0f1120', text: '#d0d4f0', border: '#252840' },
  },
];

const RADIUS_OPTIONS = [
  { id: 'rounded', label: 'Rounded',  Icon: Circle },
  { id: 'soft',    label: 'Softer',   Icon: Circle },
  { id: 'sharp',   label: 'Sharp',    Icon: Square },
];

const FONT_OPTIONS = [
  { id: 'mono',    label: 'Monospace', sample: 'Aa 12' },
  { id: 'sans',    label: 'Sans-serif', sample: 'Aa 12' },
  { id: 'rounded', label: 'Rounded',   sample: 'Aa 12' },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function SelectBox({ options, value, onChange, placeholder }) {
  return (
    <div className="select-wrap">
      <select value={value} onChange={e => onChange(e.target.value)} className="settings-select">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="select-arrow" aria-hidden />
    </div>
  );
}

function VolumeSlider({ label, value, onChange, icon: Icon }) {
  return (
    <div className="volume-row">
      <div className="volume-header">
        <Icon size={14} aria-hidden />
        <span>{label}</span>
        <span className="volume-val font-mono">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </div>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────

function AudioTab({ agora }) {
  const micOptions = agora.audioDevices.map(d => ({ value: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 6)}` }));
  const outOptions = agora.outputDevices.map(d => ({ value: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 6)}` }));

  const [testing, setTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const testStreamRef = useRef(null);
  const animFrameRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);

  const stopTest = () => {
    cancelAnimationFrame(animFrameRef.current);
    testStreamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    testStreamRef.current = null;
    analyserRef.current = null;
    audioCtxRef.current = null;
    setMicLevel(0);
    setTesting(false);
  };

  const handleTestMic = async () => {
    if (testing) { stopTest(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: agora.selectedMic ? { exact: agora.selectedMic } : undefined }
      });
      testStreamRef.current = stream;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
      setTesting(true);
    } catch (err) {
      console.error('Mic test failed:', err);
    }
  };

  useEffect(() => () => stopTest(), []);

  return (
    <div className="tab-content">
      <div className="settings-group">
        <p className="group-label">Microphone</p>
        {micOptions.length > 0 ? (
          <SelectBox options={micOptions} value={agora.selectedMic} onChange={agora.switchMic} />
        ) : (
          <p className="text-muted text-sm" style={{ padding: '8px 0' }}>No microphone detected. Grant permissions first.</p>
        )}
        <VolumeSlider label="Input volume" value={agora.localVolume} onChange={agora.changeMicVolume} icon={Mic} />
        {testing && (
          <div style={{ margin: '8px 0' }}>
            <p className="text-muted text-sm" style={{ marginBottom: 6 }}>Speak into your mic...</p>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--c-bg-overlay)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${micLevel}%`,
                background: micLevel > 70 ? 'var(--c-red)' : micLevel > 40 ? 'var(--c-green)' : 'var(--c-accent)',
                borderRadius: 4,
                transition: 'width 0.05s ease',
              }} />
            </div>
          </div>
        )}
        <button className="test-btn" onClick={handleTestMic} aria-pressed={testing}>
          {testing ? '■ Stop test' : '● Test microphone'}
        </button>
      </div>

      <div className="settings-group">
        <p className="group-label">Speaker / Output</p>
        {outOptions.length > 0 ? (
          <SelectBox options={outOptions} value={agora.selectedOutput} onChange={agora.setSelectedOutput} />
        ) : (
          <p className="text-muted text-sm" style={{ padding: '8px 0' }}>Using system default output device.</p>
        )}
        <VolumeSlider label="Output volume" value={agora.outputVolume} onChange={agora.changeOutputVolume} icon={Volume2} />
      </div>

      <div className="settings-group">
        <p className="group-label">Audio processing</p>
        {[
          { label: 'Noise suppression', desc: 'Remove background noise with AI', defaultChecked: true },
          { label: 'Echo cancellation', desc: 'Prevent speaker feedback loop', defaultChecked: true },
          { label: 'Auto gain control', desc: 'Normalize microphone volume', defaultChecked: true },
        ].map(row => (
          <div key={row.label} className="toggle-row">
            <div>
              <p className="toggle-label">{row.label}</p>
              <p className="toggle-desc">{row.desc}</p>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" defaultChecked={row.defaultChecked} aria-label={row.label} />
              <span className="toggle-track" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoTab({ agora }) {
  const camOptions = agora.videoDevices.map(d => ({ value: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 6)}` }));

  return (
    <div className="tab-content">
      <div className="settings-group">
        <p className="group-label">Camera</p>
        {camOptions.length > 0 ? (
          <SelectBox options={camOptions} value={agora.selectedCamera} onChange={agora.switchCamera} />
        ) : (
          <p className="text-muted text-sm" style={{ padding: '8px 0' }}>No camera detected. Grant permissions first.</p>
        )}
      </div>

      <div className="settings-group">
        <p className="group-label">Video quality</p>
        <SelectBox
          options={[
            { value: '1080p', label: '1080p Full HD — high bandwidth' },
            { value: '720p',  label: '720p HD — recommended' },
            { value: '480p',  label: '480p — low bandwidth' },
            { value: '360p',  label: '360p — very low bandwidth' },
          ]}
          value="720p"
          onChange={() => {}}
        />
      </div>

      <div className="settings-group">
        <p className="group-label">Video options</p>
        {[
          { label: 'Mirror my video',  desc: 'Flip camera for others to see',         defaultChecked: true  },
          { label: 'HD video',         desc: 'Send higher quality video stream',        defaultChecked: true  },
          { label: 'Low light boost',  desc: 'Brighten camera in dark environments',   defaultChecked: false },
        ].map(row => (
          <div key={row.label} className="toggle-row">
            <div>
              <p className="toggle-label">{row.label}</p>
              <p className="toggle-desc">{row.desc}</p>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" defaultChecked={row.defaultChecked} aria-label={row.label} />
              <span className="toggle-track" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function BackgroundTab() {
  const { videoBackground, setVideoBackground } = useAppStore();
  return (
    <div className="tab-content">
      <div className="settings-group">
        <p className="group-label">Virtual background</p>
        <p className="text-muted text-sm" style={{ marginBottom: 12 }}>
          Requires camera to be active. Uses browser-based segmentation.
        </p>
        <div className="background-grid">
          {BACKGROUNDS.map(bg => (
            <button
              key={bg.id}
              className={`bg-option ${videoBackground === bg.id ? 'selected' : ''}`}
              onClick={() => setVideoBackground(bg.id)}
              aria-pressed={videoBackground === bg.id}
            >
              <div className="bg-preview" style={{ background: bg.preview }} aria-hidden />
              {videoBackground === bg.id && (
                <div className="bg-check" aria-hidden><Check size={12} /></div>
              )}
              <span className="bg-label">{bg.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ThemeTab() {
  const {
    colorMode, setColorMode,
    accent, setAccent,
    radius, setRadius,
    font, setFont,
  } = useAppStore();

  return (
    <div className="tab-content">

      {/* ── Color mode ── */}
      <div className="settings-group">
        <p className="group-label">Color mode</p>
        <div className="color-mode-grid">
          {COLOR_MODE_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const active = colorMode === opt.id;
            return (
              <button
                key={opt.id}
                className={`color-mode-card ${active ? 'selected' : ''}`}
                onClick={() => setColorMode(opt.id)}
                aria-pressed={active}
                title={opt.desc}
              >
                <div
                  className="mode-preview-bg"
                  style={{ background: opt.preview.bg, border: `1px solid ${opt.preview.border}` }}
                >
                  <div className="mode-preview-sidebar" style={{ background: opt.preview.raised }} />
                  <div className="mode-preview-content">
                    <div className="mode-preview-bar" style={{ background: opt.preview.raised }} />
                    <div className="mode-preview-text" style={{ background: opt.preview.text, opacity: 0.8 }} />
                    <div className="mode-preview-text short" style={{ background: opt.preview.text, opacity: 0.4 }} />
                  </div>
                </div>
                {active && (
                  <div className="mode-check" aria-hidden>
                    <Check size={10} />
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7 }}>
                  <Icon size={12} aria-hidden style={{ opacity: 0.7 }} />
                  <span className="mode-label">{opt.label}</span>
                </div>
                <span className="mode-desc">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Accent color ── */}
      <div className="settings-group">
        <p className="group-label">Accent color</p>
        <div className="theme-grid">
          {ACCENT_OPTIONS.map(t => (
            <button
              key={t.id}
              className={`theme-swatch ${accent === t.id ? 'selected' : ''}`}
              onClick={() => setAccent(t.id)}
              aria-pressed={accent === t.id}
              aria-label={`${t.label} accent`}
            >
              <div
                className="swatch-circle"
                style={{ background: t.color, boxShadow: `0 0 12px ${t.color}55` }}
                aria-hidden
              >
                {accent === t.id && <Check size={14} color="#fff" aria-hidden />}
              </div>
              <span className="swatch-label">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Corner radius ── */}
      <div className="settings-group">
        <p className="group-label">Corner style</p>
        <div className="radius-grid">
          {RADIUS_OPTIONS.map(opt => {
            const { Icon } = opt;
            const active = radius === opt.id;
            return (
              <button
                key={opt.id}
                className={`radius-option ${active ? 'selected' : ''}`}
                onClick={() => setRadius(opt.id)}
                aria-pressed={active}
              >
                <div
                  className="radius-preview"
                  style={{
                    borderRadius: opt.id === 'sharp' ? 3 : opt.id === 'soft' ? 16 : 8,
                  }}
                />
                <span className="radius-label">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Font ── */}
      <div className="settings-group">
        <p className="group-label">Interface font</p>
        <div className="font-grid">
          {FONT_OPTIONS.map(opt => {
            const active = font === opt.id;
            const families = {
              mono:    '"JetBrains Mono", monospace',
              sans:    '"Inter", system-ui, sans-serif',
              rounded: '"Nunito", "Varela Round", system-ui, sans-serif',
            };
            return (
              <button
                key={opt.id}
                className={`font-option ${active ? 'selected' : ''}`}
                onClick={() => setFont(opt.id)}
                aria-pressed={active}
                style={{ fontFamily: families[opt.id] }}
              >
                <span className="font-sample" style={{ fontFamily: families[opt.id] }}>Aa</span>
                <span className="font-label">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Live preview ── */}
      <div className="settings-group">
        <p className="group-label">Preview</p>
        <div className="theme-preview-card">
          <div className="tp-header">
            <div className="tp-dot" style={{ background: 'var(--c-accent)' }} />
            <span className="tp-title font-mono" style={{ color: 'var(--c-accent)' }}>juno</span>
          </div>
          <div className="tp-row">
            <div className="tp-avatar" />
            <div className="tp-lines">
              <div className="tp-line long" />
              <div className="tp-line short" />
            </div>
          </div>
          <button className="tp-btn" style={{ background: 'var(--c-accent)' }}>
            Join channel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

export function SettingsModal({ agora }) {
  const { settingsOpen, settingsTab, closeSettings, setSettingsTab } = useAppStore();
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') closeSettings(); };
    if (settingsOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [settingsOpen, closeSettings]);

  if (!settingsOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) closeSettings();
  };

  const tabContent = {
    audio:      <AudioTab agora={agora} />,
    video:      <VideoTab agora={agora} />,
    background: <BackgroundTab />,
    theme:      <ThemeTab />,
  };

  return (
    <div
      className="settings-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal
      aria-label="Settings"
    >
      <div className="settings-modal">
        <div className="modal-header">
          <h2 className="modal-title font-mono">settings</h2>
          <button className="modal-close" onClick={closeSettings} aria-label="Close settings">
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="modal-body">
          <nav className="settings-nav" aria-label="Settings tabs">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`settings-tab ${settingsTab === tab.id ? 'active' : ''}`}
                onClick={() => setSettingsTab(tab.id)}
                aria-current={settingsTab === tab.id ? 'page' : undefined}
              >
                <tab.icon size={16} aria-hidden />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="settings-content" key={settingsTab}>
            {tabContent[settingsTab]}
          </div>
        </div>
      </div>
    </div>
  );
}