import React, { useEffect } from 'react';
import { useGame } from '../../context/GameContext';

export default function PlayerSync() {
  const { syncState, resetGame } = useGame();

  // Auto-sync every 3 seconds
  useEffect(() => {
    syncState();
    const interval = setInterval(syncState, 3000);
    return () => clearInterval(interval);
  }, [syncState]);

  return (
    <div className="screen center">
      <div className="card" style={{ maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
        <p className="waiting-message">Waiting for next question...</p>
        <p className="hint-text" style={{ marginTop: '0.5rem' }}>
          Syncing with host automatically
        </p>
        <button
          className="btn btn-primary"
          style={{ marginTop: '1.5rem' }}
          onClick={syncState}
        >
          Sync Now
        </button>
        <button
          className="btn-ghost"
          style={{ marginTop: '1rem', fontSize: '0.85rem' }}
          onClick={resetGame}
        >
          Leave Game
        </button>
      </div>
    </div>
  );
}