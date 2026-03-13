import React from 'react';
import { useGame } from '../../context/GameContext';

export default function PlayerFinal() {
  const { players, scores, playerId, resetGame } = useGame();

  const ranked = players.slice().sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  const myRank = ranked.findIndex(p => p.id === playerId) + 1;
  const winner = ranked[0];
  const isWinner = winner?.id === playerId;
  const medals = ['🥇', '🥈', '🥉'];

  const messages = [
    'You won! Master of deception! 👑',
    'So close! Runner-up! 🔥',
    'Bronze medal — not bad! 💪',
  ];
  const fallbackMsg = `You placed #${myRank} — better luck next time!`;
  const myMessage = myRank <= 3 ? messages[myRank - 1] : fallbackMsg;

  return (
    <div className="screen center">
      <div className="card" style={{ maxWidth: 440, textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '.5rem' }}>
          {isWinner ? '🎉' : '🏆'}
        </div>
        <h2 className="card-title">Game Over!</h2>

        <div className="player-results-rank" style={{ margin: '1rem 0' }}>
          <span className="your-rank-number" style={{ color: players.find(p => p.id === playerId)?.color }}>
            {medals[myRank - 1] || `#${myRank}`}
          </span>
          <span className="your-rank-score">{scores[playerId] || 0} pts</span>
          <p className="your-rank-msg">{myMessage}</p>
        </div>

        {winner && !isWinner && (
          <p className="hint-text" style={{ marginBottom: '1rem' }}>
            Winner: <strong style={{ color: winner.color }}>{winner.name}</strong> with {scores[winner.id]} pts
          </p>
        )}

        <div className="final-leaderboard">
          {ranked.map((p, i) => (
            <div
              key={p.id}
              className={`final-rank-row ${p.id === playerId ? 'my-row' : ''} ${i === 0 ? 'first-place' : ''}`}
            >
              <span className="rank-medal">{medals[i] || `${i + 1}.`}</span>
              <span className="rank-name" style={{ color: p.color }}>
                {p.name}{p.id === playerId ? ' (you)' : ''}
              </span>
              <span className="rank-score">{scores[p.id] || 0} pts</span>
            </div>
          ))}
        </div>

        <button className="btn btn-primary btn-lg" style={{ marginTop: '1.5rem' }} onClick={resetGame}>
          🔄 Play Again
        </button>
      </div>
    </div>
  );
}
