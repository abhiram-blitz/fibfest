import React from 'react';
import { useGame } from '../../context/GameContext';

export default function HostLobby() {
  const { gameCode, players, startGame, resetGame, questions, MAX_PLAYERS } = useGame();

  return (
    <div className="screen">
      <header className="host-header">
        <span className="logo-sm">🎭 FibFest</span>
        <button className="btn-ghost" onClick={resetGame}>Exit</button>
      </header>

      <div className="lobby-layout">
        <div className="lobby-code-panel">
          <p className="lobby-instructions">Players: open FibFest and join with this code</p>
          <div className="game-code-display">{gameCode}</div>
          <p className="lobby-sub">abhiram-blitz.github.io/fibfest</p>

          <div className="lobby-meta">
            <span>📋 {questions.length} questions</span>
            <span>👥 {players.length} / {MAX_PLAYERS} players</span>
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={startGame}
            disabled={players.length < 1}
          >
            {players.length < 1 ? 'Waiting for players...' : `Start Game (${players.length} players)`}
          </button>
          {players.length < 2 && players.length > 0 && (
            <p className="hint-text">Tip: At least 2 players makes it more fun!</p>
          )}
        </div>

        <div className="player-list-panel">
          <h3 className="panel-title">Players Joined</h3>
          {players.length === 0 ? (
            <div className="empty-players">
              <span className="empty-icon">⏳</span>
              <p>No players yet...</p>
            </div>
          ) : (
            <ul className="player-grid">
              {players.map(p => (
                <li key={p.id} className="player-chip" style={{ background: p.color }}>
                  {p.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
