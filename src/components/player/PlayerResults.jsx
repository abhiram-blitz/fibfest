import React from 'react';
import { useGame } from '../../context/GameContext';

export default function PlayerResults() {
  const {
    roundResults, players, roundScores, scores, playerId,
    currentQuestionIndex, questions, phase, PHASE, syncState,
  } = useGame();

  const me = players.find(p => p.id === playerId);
  const isLeaderboard = phase === PHASE.LEADERBOARD;

  // Leaderboard view
  if (isLeaderboard || !roundResults) {
    const ranked = players.slice().sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
    const myRank = ranked.findIndex(p => p.id === playerId) + 1;
    const medals = ['🥇', '🥈', '🥉'];

    return (
      <div className="screen center">
        <div className="card" style={{ maxWidth: 420 }}>
          <h2 className="card-title">🏆 Leaderboard</h2>
          <p className="hint-text">After question {currentQuestionIndex + 1} of {questions.length}</p>

          <div className="player-results-rank">
            <span className="your-rank-label">Your rank</span>
            <span className="your-rank-number" style={{ color: me?.color }}>
              {medals[myRank - 1] || `#${myRank}`}
            </span>
            <span className="your-rank-score">{scores[playerId] || 0} pts</span>
          </div>

          <div className="final-leaderboard" style={{ marginTop: '1rem' }}>
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
          <button className="btn btn-primary" style={{ marginTop: '1.5rem', width: '100%' }} onClick={syncState}>
            Next Question
          </button>
          <p className="hint-text" style={{ marginTop: '0.5rem', fontSize: '0.8rem', textAlign: 'center' }}>
            Works once the host starts the next round
          </p>
        </div>
      </div>
    );
  }

  // Round results view
  const getPlayer = (id) => players.find(p => p.id === id);
  const myRoundPts = roundScores[playerId] || 0;

  return (
    <div className="screen center">
      <div className="card" style={{ maxWidth: 440 }}>
        <h2 className="card-title">📊 Round Results</h2>

        <div className="player-results-rank" style={{ marginBottom: '1rem' }}>
          <span className="your-rank-label">You scored</span>
          <span
            className="your-rank-number"
            style={{ color: myRoundPts > 0 ? 'var(--accent)' : 'var(--muted)' }}
          >
            {myRoundPts > 0 ? `+${myRoundPts}` : '0'}
          </span>
          <span className="your-rank-score">Total: {scores[playerId] || 0} pts</span>
        </div>

        <div className="player-results-list">
          {roundResults.map((ans, i) => (
            <div
              key={i}
              className={`player-result-row ${ans.isReal ? 'real-answer-row' : 'fake-answer-row'}`}
            >
              <div className="player-result-top">
                <span className="answer-letter">{String.fromCharCode(65 + i)}</span>
                <span className="player-result-text">{ans.text}</span>
                {ans.isReal
                  ? <span className="truth-badge">✅ TRUTH</span>
                  : <span className="fib-badge">🤥 FIB</span>
                }
              </div>
              <div className="player-result-meta">
                {!ans.isReal && (
                  <span className="written-by">
                    by <strong style={{ color: getPlayer(ans.authorId)?.color }}>
                      {ans.authorId === playerId ? 'you' : getPlayer(ans.authorId)?.name || '?'}
                    </strong>
                  </span>
                )}
                {ans.voters.length > 0 && (
                  <span className="fooled-list">
                    {ans.isReal ? 'Correct: ' : 'Fooled: '}
                    {ans.voters.map(v => (
                      <span
                        key={v.id}
                        className="player-chip-sm"
                        style={{ background: v.color }}
                      >
                        {v.id === playerId ? 'you' : v.name}
                      </span>
                    ))}
                  </span>
                )}
                {!ans.isReal && ans.voters.length === 0 && (
                  <span className="no-votes">No one picked this</span>
                )}
                {ans.isReal && ans.voters.length === 0 && (
                  <span className="no-votes">Nobody got it right!</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginTop: '1.5rem', width: '100%' }} onClick={syncState}>
          Next Question
        </button>
        <p className="hint-text" style={{ marginTop: '0.5rem', fontSize: '0.8rem', textAlign: 'center' }}>
          Works once the host starts the next round
        </p>
      </div>
    </div>
  );
}
