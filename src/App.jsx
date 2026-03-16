import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Home from './components/Home';
import HostApp from './components/host/HostApp';
import PlayerApp from './components/player/PlayerApp';

function GameRouter() {
  const { role } = useGame();
  if (role === 'host') return <HostApp />;
  if (role === 'player') return <PlayerApp />;
  return <Home />;
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#fff', fontFamily: 'sans-serif' }}>
          <h1>Something went wrong</h1>
          <p style={{ opacity: 0.7 }}>{this.state.error?.message || 'Unknown error'}</p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              marginTop: '1rem', padding: '0.75rem 1.5rem',
              background: '#6366f1', color: '#fff', border: 'none',
              borderRadius: '8px', cursor: 'pointer', fontSize: '1rem',
            }}
          >
            Reset &amp; Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <GameRouter />
      </GameProvider>
    </ErrorBoundary>
  );
}
