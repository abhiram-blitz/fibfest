import React from 'react';
import { useGame } from '../../context/GameContext';

export default function HostVoting() {
  const { shuffledAnswers, players, votes, votedCount, showResults } = useGame();

  const totalPlayers = players.length;
  const pct = totalPlayers > 0 ? (votedCount / totalPlayers) * 100 : 0;
  const allVoted = votedCount >= totalPlayers && totalPlayers > 0;

  return (
    <div className="screen">
      <header className="host-header">
        <span className="phase-label">🗳️ Voting Time!</span>
      </header>

      <div className="center-content">
        <p className="voting-instructions">Players: pick the answer you think is REAL</p>

        <div className="answer-list">
          {shuffledAnswers.map((ans, i) => (
            <div key={i} className="answer-option">
              <span className="answer-letter">{String.fromCharCode(65 + i)}</span>
              <span className="answer-text">{ans.text}</span>
              <span className="vote-count">
                {players.filter(p => votes[p.id] === i).map(p => (
                  <span
                    key={p.id}
                    className="voter-dot"
                    style={{ background: p.color }}
                    title={p.name}
                  />
                ))}
              </span>
            </div>
          ))}
        </div>

        <div className="submission-tracker">
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: `${pct}%` }} />
          </div>
          <p className="progress-label">{votedCount} / {totalPlayers} votes cast</p>
        </div>

        <button
          className="btn btn-primary btn-lg"
          onClick={showResults}
          disabled={votedCount === 0}
        >
          {allVoted ? '🔍 Reveal Answers!' : `Reveal Answers (${votedCount} voted)`}
        </button>
      </div>
    </div>
  );
}
