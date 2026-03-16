import React from 'react';
import { useGame } from '../../context/GameContext';

export default function PlayerNextRound() {
  const {
    playerNextQuestion, scores, playerId, players,
    currentQuestionIndex, totalQuestions, resetGame,
  } = useGame();

  const me = players.find(p => p.id === playerId);
  const myScore = scores[playerId] || 0;

  // If no game data, show leave button
  if (!totalQuestions) {
    return (
      <div className="screen center">
        <div className="card" style={{ maxWidth: 380, textAlign: 'center' }}>
          <p className="waiting-message">No active game found.</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={resetGame}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen center">
      <div className="card" style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '1rem', opacity: 0.7 }}>Your score</span>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: me?.color || 'var(--accent)' }}>
            {myScore} pts
          </div>
          <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
        </div>

        <p className="hint-text" style={{ marginBottom: '1.5rem' }}>
          Wait for the host to announce the next round, then tap below.
        </p>

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          onClick={playerNextQuestion}
        >
          Next Question
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