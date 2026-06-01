import './styles/globals.css';
import { useAgora } from './hooks/useAgora';
import { useAppStore } from './contexts/store';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { CallView } from './components/CallView';
import { SettingsModal } from './components/Settings';
import { Notifications } from './components/Notifications';

export default function App() {
  const agora = useAgora();
  const { currentView } = useAppStore();

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
      {/* Sidebar */}
      <Sidebar agora={agora} />

      {/* Main area */}
      <main
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        role="main"
      >
        {currentView === 'home' && <HomeView agora={agora} />}
        {currentView === 'call' && <CallView agora={agora} />}
      </main>

      {/* Modals & overlays */}
      <SettingsModal agora={agora} />
      <Notifications />
    </div>
  );
}
