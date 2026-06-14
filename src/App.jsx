import './styles/globals.css';
import { useEffect } from 'react';
import { useAgora } from './hooks/useAgora';
import { useAppStore } from './contexts/store';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { CallView } from './components/CallView';
import { TextChannel } from './components/TextChannel';
import { SettingsModal } from './components/Settings';
import { Notifications } from './components/Notifications';

export default function App() {
  const agora = useAgora();
  const { currentView, initTheme } = useAppStore();

  // Apply stored theme tokens to CSS vars on first mount
  useEffect(() => {
    initTheme();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Sidebar agora={agora} />

      <main
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        role="main"
      >
        {currentView === 'home' && <HomeView agora={agora} />}
        {currentView === 'call' && <CallView agora={agora} />}
        {currentView === 'text' && <TextChannel />}
      </main>

      <SettingsModal agora={agora} />
      <Notifications />
    </div>
  );
}