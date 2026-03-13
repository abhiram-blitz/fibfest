import React from 'react';
import { useGame } from '../../context/GameContext';

export default function Scoreboard() {
  const { players, scores, currentQuestionIndex, questions, continueGame, resetGame } = useGame();
  const ranked = players.slice().sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="screen center">
      <div className="card" style={{ maxWidth: 540, width: '100%' }}>
        <h2 className="card-title">🏆 Leaderboard</h2>
        <p className="hint-text">After question {currentQuestionIndex + 1} of {questions.length}</p>

        <div className="final-leaderboard">
          {ranked.map((p, i) => (
            <div key={p.id} className={`final-rank-row ${i === 0 ? 'first-place' : ''}`}>
              <span className="rank-medal">{medals[i] || `${i + 1}.`}</span>
              <span className="rank-name" style={{ color: p.color }}>{p.name}</span>
              <span className="rank-score">{scores[p.id] || 0} pts</span>
            </div>
          ))}
        </div>

        <div className="results-actions" style={{ marginTop: '1.5rem' }}>
          <button className="btn btn-outline" onClick={resetGame}>End Game</button>
          <button className="btn btn-primary btn-lg" onClick={continueGame}>Continue →</button>
        </div>
      </div>
    </div>
  );
}
