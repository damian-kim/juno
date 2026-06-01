import { useAppStore } from '../contexts/store';

export function Notifications() {
  const { notifications } = useAppStore();

  if (!notifications.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
      role="status"
      aria-live="polite"
    >
      {notifications.map(n => (
        <div
          key={n.id}
          style={{
            background: 'var(--c-bg-elevated)',
            border: '1px solid var(--c-border-hover)',
            borderLeft: '3px solid var(--c-accent)',
            borderRadius: 'var(--r-md)',
            padding: '9px 16px',
            fontSize: 13,
            color: 'var(--c-text-primary)',
            animation: 'fade-in 0.22s ease',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            maxWidth: 280,
          }}
        >
          {n.msg}
        </div>
      ))}
    </div>
  );
}
