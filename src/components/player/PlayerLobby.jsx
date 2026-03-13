import React from 'react';
import { useGame } from '../../context/GameContext';

export default function PlayerLobby() {
  const { playerName, gameCode, players, resetGame } = useGame();
  const me = players.find(p => p.name === playerName);

  return (
    <div className="screen center">
      <div className="card" style={{ maxWidth: 380 }}>
        <button className="btn-ghost back-btn" onClick={resetGame}>← Leave</button>

        <div className="player-avatar" style={{ background: me?.color || '#666' }}>
          {playerName?.[0]?.toUpperCase()}
        </div>
        <h2 className="card-title">{playerName}</h2>
        <p className="hint-text">You're in game <strong>{gameCode}</strong></p>

        <div className="waiting-pulse">
          <span className="pulse-dot" />
          Waiting for host to start...
        </div>

        <div className="lobby-players-sm">
          <p className="hint-text">{players.length} player{players.length !== 1 ? 's' : ''} joined:</p>
          <div className="player-grid-sm">
            {players.map(p => (
              <span key={p.id} className="player-chip-sm" style={{ background: p.color }}>
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
