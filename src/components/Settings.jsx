import { useEffect, useRef, useState } from 'react';
import {
  X, Mic, Volume2, Video, Palette, Monitor,
  ChevronDown, Check
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
  { id: 'none',   label: 'None',        preview: '#0e0f14' },
  { id: 'blur',   label: 'Blur',        preview: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' },
  { id: 'office', label: 'Office',      preview: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)' },
  { id: 'cafe',   label: 'Café',        preview: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)' },
  { id: 'space',  label: 'Space',       preview: 'linear-gradient(135deg, #0d1117 0%, #1a0533 100%)' },
  { id: 'beach',  label: 'Beach',       preview: 'linear-gradient(135deg, #00b4db 0%, #f7b731 100%)' },
];

const THEME_OPTIONS = [
  { id: 'violet', label: 'Violet', color: '#7c6dfa' },
  { id: 'cyan',   label: 'Cyan',   color: '#00d2ff' },
  { id: 'green',  label: 'Green',  color: '#3dd68c' },
  { id: 'rose',   label: 'Rose',   color: '#f04d87' },
  { id: 'amber',  label: 'Amber',  color: '#f5a623' },
];

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

function AudioTab({ agora }) {
  const micOptions = agora.audioDevices.map(d => ({ value: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0,6)}` }));
  const outOptions = agora.outputDevices.map(d => ({ value: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0,6)}` }));

  const [testing, setTesting] = useState(false);
  const audioCtxRef = useRef(null);

  const handleTestMic = () => {
    setTesting(v => !v);
    // Real app: toggle audio capture visualization here
  };

  return (
    <div className="tab-content">
      <div className="settings-group">
        <p className="group-label">Microphone</p>
        {micOptions.length > 0 ? (
          <SelectBox
            options={micOptions}
            value={agora.selectedMic}
            onChange={agora.switchMic}
          />
        ) : (
          <p className="text-muted text-sm" style={{ padding: '8px 0' }}>
            No microphone detected. Grant permissions first.
          </p>
        )}

        <VolumeSlider
          label="Input volume"
          value={agora.localVolume}
          onChange={agora.changeMicVolume}
          icon={Mic}
        />

        <button className="test-btn" onClick={handleTestMic} aria-pressed={testing}>
          {testing ? '■ Stop test' : '● Test microphone'}
        </button>
      </div>

      <div className="settings-group">
        <p className="group-label">Speaker / Output</p>
        {outOptions.length > 0 ? (
          <SelectBox
            options={outOptions}
            value={agora.selectedOutput}
            onChange={agora.setSelectedOutput}
          />
        ) : (
          <p className="text-muted text-sm" style={{ padding: '8px 0' }}>
            Using system default output device.
          </p>
        )}
        <VolumeSlider
          label="Output volume"
          value={agora.outputVolume}
          onChange={agora.changeOutputVolume}
          icon={Volume2}
        />
      </div>

      <div className="settings-group">
        <p className="group-label">Audio processing</p>
        <div className="toggle-row">
          <div>
            <p className="toggle-label">Noise suppression</p>
            <p className="toggle-desc">Remove background noise with AI</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" defaultChecked aria-label="Noise suppression" />
            <span className="toggle-track" />
          </label>
        </div>
        <div className="toggle-row">
          <div>
            <p className="toggle-label">Echo cancellation</p>
            <p className="toggle-desc">Prevent speaker feedback loop</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" defaultChecked aria-label="Echo cancellation" />
            <span className="toggle-track" />
          </label>
        </div>
        <div className="toggle-row">
          <div>
            <p className="toggle-label">Auto gain control</p>
            <p className="toggle-desc">Normalize microphone volume</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" defaultChecked aria-label="Auto gain control" />
            <span className="toggle-track" />
          </label>
        </div>
      </div>
    </div>
  );
}

function VideoTab({ agora }) {
  const camOptions = agora.videoDevices.map(d => ({ value: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0,6)}` }));

  return (
    <div className="tab-content">
      <div className="settings-group">
        <p className="group-label">Camera</p>
        {camOptions.length > 0 ? (
          <SelectBox
            options={camOptions}
            value={agora.selectedCamera}
            onChange={agora.switchCamera}
          />
        ) : (
          <p className="text-muted text-sm" style={{ padding: '8px 0' }}>No camera detected. Grant permissions first.</p>
        )}
      </div>

      <div className="settings-group">
        <p className="group-label">Video quality</p>
        <SelectBox
          options={[
            { value: '720p', label: '720p HD — recommended' },
            { value: '1080p', label: '1080p Full HD — high bandwidth' },
            { value: '480p', label: '480p — low bandwidth' },
            { value: '360p', label: '360p — very low bandwidth' },
          ]}
          value="720p"
          onChange={() => {}}
        />
      </div>

      <div className="settings-group">
        <p className="group-label">Video options</p>
        <div className="toggle-row">
          <div>
            <p className="toggle-label">Mirror my video</p>
            <p className="toggle-desc">Flip camera for others to see</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" defaultChecked aria-label="Mirror my video" />
            <span className="toggle-track" />
          </label>
        </div>
        <div className="toggle-row">
          <div>
            <p className="toggle-label">HD video</p>
            <p className="toggle-desc">Send higher quality video stream</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" defaultChecked aria-label="HD video" />
            <span className="toggle-track" />
          </label>
        </div>
        <div className="toggle-row">
          <div>
            <p className="toggle-label">Low light boost</p>
            <p className="toggle-desc">Brighten camera in dark environments</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" aria-label="Low light boost" />
            <span className="toggle-track" />
          </label>
        </div>
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
        <p className="group-note text-muted text-sm" style={{ marginBottom: 12 }}>
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
              <div
                className="bg-preview"
                style={{ background: bg.preview }}
                aria-hidden
              />
              {videoBackground === bg.id && (
                <div className="bg-check" aria-hidden>
                  <Check size={12} />
                </div>
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
  const { theme, setTheme } = useAppStore();

  return (
    <div className="tab-content">
      <div className="settings-group">
        <p className="group-label">Accent color</p>
        <div className="theme-grid">
          {THEME_OPTIONS.map(t => (
            <button
              key={t.id}
              className={`theme-swatch ${theme === t.id ? 'selected' : ''}`}
              onClick={() => setTheme(t.id)}
              aria-pressed={theme === t.id}
              aria-label={`${t.label} theme`}
            >
              <div
                className="swatch-circle"
                style={{ background: t.color, boxShadow: `0 0 12px ${t.color}55` }}
                aria-hidden
              >
                {theme === t.id && <Check size={14} color="#fff" aria-hidden />}
              </div>
              <span className="swatch-label">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-group">
        <p className="group-label">Theme preview</p>
        <div className="theme-preview-card">
          <div className="tp-header">
            <div className="tp-dot" style={{ background: 'var(--c-accent)' }} />
            <span className="tp-title font-mono" style={{ color: 'var(--c-accent)' }}>wavelength</span>
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
    <div className="settings-overlay" ref={overlayRef} onClick={handleOverlayClick} role="dialog" aria-modal aria-label="Settings">
      <div className="settings-modal">
        {/* Modal header */}
        <div className="modal-header">
          <h2 className="modal-title font-mono">settings</h2>
          <button className="modal-close" onClick={closeSettings} aria-label="Close settings">
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="modal-body">
          {/* Tab sidebar */}
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

          {/* Tab content */}
          <div className="settings-content" key={settingsTab}>
            {tabContent[settingsTab]}
          </div>
        </div>
      </div>
    </div>
  );
}
