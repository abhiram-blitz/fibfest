import React from 'react';
import { useGame } from '../../context/GameContext';

export default function HostFinal() {
  const { players, scores, resetGame } = useGame();

  const ranked = players.slice().sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  const winner = ranked[0];

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="screen center">
      <div className="final-screen">
        <div className="winner-announce">
          <div className="confetti-emoji">🎉</div>
          <h2 className="final-title">Game Over!</h2>
          {winner && (
            <>
              <p className="winner-label">Winner</p>
              <div
                className="winner-name"
                style={{ color: winner.color }}
              >
                {winner.name}
              </div>
              <div className="winner-score">{scores[winner.id] || 0} points</div>
            </>
          )}
        </div>

        <div className="final-leaderboard">
          {ranked.map((p, i) => (
            <div key={p.id} className={`final-rank-row ${i === 0 ? 'first-place' : ''}`}>
              <span className="rank-medal">{medals[i] || `${i + 1}.`}</span>
              <span className="rank-name" style={{ color: p.color }}>{p.name}</span>
              <span className="rank-score">{scores[p.id] || 0} pts</span>
            </div>
          ))}
        </div>

        <button className="btn btn-primary btn-lg" onClick={resetGame}>
          🔄 Play Again
        </button>
      </div>
    </div>
  );
}
