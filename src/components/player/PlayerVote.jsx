import React from 'react';
import { useGame } from '../../context/GameContext';

export default function PlayerVote() {
  const { shuffledAnswers, playerId, votes, submitVote, players, submissions } = useGame();
  const hasVoted = votes[playerId] !== undefined;
  const myAnswer = submissions[playerId];
  const me = players.find(p => p.id === playerId);

  if (hasVoted) {
    return (
      <div className="screen center">
        <div className="card" style={{ maxWidth: 380 }}>
          <div className="submitted-state">
            <span className="submitted-icon">🗳️</span>
            <h3>Vote cast!</h3>
            <p className="hint-text">Watch the main screen for the reveal...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen center">
      <div className="card player-vote-card">
        <h3 className="vote-heading">Which answer is REAL?</h3>
        <p className="hint-text">You can't vote for your own fib!</p>

        <div className="vote-options">
          {shuffledAnswers.map((ans, i) => {
            const isMyOwn = ans.authorId === playerId || ans.text === myAnswer;
            return (
              <button
                key={i}
                className={`vote-btn ${isMyOwn ? 'vote-btn-own' : ''}`}
                onClick={() => !isMyOwn && submitVote(i)}
                disabled={isMyOwn}
                style={isMyOwn ? {} : { '--hover-color': me?.color }}
              >
                <span className="vote-letter">{String.fromCharCode(65 + i)}</span>
                <span className="vote-text">{ans.text}</span>
                {isMyOwn && <span className="own-badge">yours</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
