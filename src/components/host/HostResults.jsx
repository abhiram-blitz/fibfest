import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';

export default function HostResults() {
  const {
    roundResults, players, roundScores, scores,
    currentQuestionIndex, questions, nextQuestion, showLeaderboard,
    currentQuestion,
  } = useGame();

  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (!roundResults) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setRevealed(i);
      if (i >= roundResults.length) clearInterval(interval);
    }, 900);
    return () => clearInterval(interval);
  }, [roundResults]);

  if (!roundResults) return null;

  const getPlayer = (id) => players.find(p => p.id === id);
  const isLastQuestion = currentQuestionIndex >= questions.length - 1;

  return (
    <div className="screen">
      <header className="host-header">
        <span className="phase-label">📊 Results</span>
        <span className="category-badge">{currentQuestion?.category}</span>
      </header>

      <div className="results-layout">
        <div className="results-answers">
          {roundResults.map((ans, i) => (
            <div
              key={i}
              className={`result-card ${i < revealed ? 'revealed' : 'hidden'} ${ans.isReal ? 'real-answer' : 'fake-answer'}`}
            >
              <div className="result-card-top">
                <span className="answer-letter">{String.fromCharCode(65 + i)}</span>
                <span className="result-text">{ans.text}</span>
                {i < revealed && (
                  ans.isReal
                    ? <span className="truth-badge">✅ TRUTH</span>
                    : <span className="fib-badge">🤥 FIB</span>
                )}
              </div>

              {i < revealed && (
                <div className="result-card-bottom">
                  {!ans.isReal && (
                    <span className="written-by">
                      Written by:&nbsp;
                      <strong style={{ color: getPlayer(ans.authorId)?.color || '#fff' }}>
                        {getPlayer(ans.authorId)?.name || 'Unknown'}
                      </strong>
                    </span>
                  )}
                  {ans.voters.length > 0 ? (
                    <div className="voters-row">
                      <span className="voted-label">Fooled:</span>
                      {ans.voters.map(v => (
                        <span
                          key={v.id}
                          className="player-chip-sm"
                          style={{ background: v.color }}
                        >
                          {v.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    i < revealed && !ans.isReal && (
                      <span className="no-votes">No one picked this 😬</span>
                    )
                  )}
                  {ans.isReal && ans.voters.length > 0 && (
                    <div className="voters-row">
                      <span className="voted-label">Got it right:</span>
                      {ans.voters.map(v => (
                        <span key={v.id} className="player-chip-sm" style={{ background: v.color }}>
                          {v.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {ans.isReal && ans.voters.length === 0 && (
                    <span className="no-votes">Nobody guessed the truth! 😈</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {revealed >= roundResults.length && (
          <div className="round-scores">
            <h3>Points This Round</h3>
            <div className="score-list">
              {players
                .slice()
                .sort((a, b) => (roundScores[b.id] || 0) - (roundScores[a.id] || 0))
                .map(p => (
                  <div key={p.id} className="score-row">
                    <span className="score-name" style={{ color: p.color }}>{p.name}</span>
                    <span className="score-delta">
                      {roundScores[p.id] > 0 ? `+${roundScores[p.id]}` : '—'}
                    </span>
                    <span className="score-total">{scores[p.id] || 0} pts</span>
                  </div>
                ))}
            </div>

            <div className="results-actions">
              <button className="btn btn-outline" onClick={showLeaderboard}>
                🏆 Leaderboard
              </button>
              <button className="btn btn-primary btn-lg" onClick={nextQuestion}>
                {isLastQuestion ? '🎉 Final Results!' : '➡️ Next Question'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
