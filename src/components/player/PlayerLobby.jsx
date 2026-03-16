import React from 'react';
import { useGame } from '../../context/GameContext';

export default function PlayerLobby() {
  const { playerName, gameCode, resetGame, playerStartGame } = useGame();

  return (
    <div className="screen center">
      <div className="card" style={{ maxWidth: 380, textAlign: 'center' }}>
        <button className="btn-ghost back-btn" onClick={resetGame}>← Leave</button>

        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎭</div>
        <h2 className="card-title">{playerName}</h2>
        <p className="hint-text">You're in game <strong>{gameCode}</strong></p>

        <p className="hint-text" style={{ marginTop: '1.5rem' }}>
          Wait for the host to start the game, then tap below.
        </p>

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%', marginTop: '1rem' }}
          onClick={playerStartGame}
        >
          Start Playing
        </button>
      </div>
    </div>
  );
}
