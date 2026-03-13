import React from 'react';
import { useGame } from '../../context/GameContext';

export default function PlayerWaiting({ message, icon }) {
  const { resetGame } = useGame();
  return (
    <div className="screen center">
      <div className="card" style={{ maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{icon || '⏳'}</div>
        <p className="waiting-message">{message || 'Waiting...'}</p>
        <button className="btn-ghost" style={{ marginTop: '2rem' }} onClick={resetGame}>
          Leave Game
        </button>
      </div>
    </div>
  );
}
