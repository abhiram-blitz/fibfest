import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';

function QuestionText({ text }) {
  const parts = text.split('___');
  return (
    <p className="question-text-sm">
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && <span className="blank">___________</span>}
        </React.Fragment>
      ))}
    </p>
  );
}

export default function PlayerAnswer() {
  const { currentQuestion, playerId, submissions, submitAnswer, players, playerName } = useGame();
  const [answer, setAnswer] = useState('');
  const hasSubmitted = !!submissions[playerId];
  const me = players.find(p => p.id === playerId);

  useEffect(() => { setAnswer(''); }, [currentQuestion?.id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answer.trim() || hasSubmitted) return;
    submitAnswer(answer);
  };

  if (!currentQuestion) return null;

  if (hasSubmitted) {
    return (
      <div className="screen center">
        <div className="card" style={{ maxWidth: 380 }}>
          <div className="submitted-state">
            <span className="submitted-icon">✅</span>
            <h3>Fib submitted!</h3>
            <p className="hint-text">Waiting for others...</p>
            <div className="submitted-answer-preview" style={{ borderColor: me?.color }}>
              "{submissions[playerId]}"
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen center">
      <div className="card player-answer-card">
        <div className="question-category-sm">{currentQuestion.category}</div>
        <QuestionText text={currentQuestion.text} />

        <form onSubmit={handleSubmit} className="form-stack">
          <label className="form-label">
            Your fake answer (or the real one — if you know it!)
            <input
              className="input"
              type="text"
              placeholder="Type a convincing answer..."
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              maxLength={80}
              autoFocus
              required
            />
          </label>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={!answer.trim()}
            style={{ background: me?.color || undefined }}
          >
            Submit Fib 🤥
          </button>
        </form>
      </div>
    </div>
  );
}
