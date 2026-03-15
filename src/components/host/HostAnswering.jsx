import React from 'react';
import { useGame } from '../../context/GameContext';

function QuestionText({ text }) {
  const parts = text.split('___');
  return (
    <p className="question-text">
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && <span className="blank">___________</span>}
        </React.Fragment>
      ))}
    </p>
  );
}

export default function HostAnswering() {
  const {
    currentQuestion, currentQuestionIndex, questions,
    players, submissions, submittedCount, submissionCap, startVoting,
  } = useGame();

  if (!currentQuestion) return null;

  const totalPlayers = players.length;
  const target = submissionCap;
  const pct = target > 0 ? Math.min((submittedCount / target) * 100, 100) : 0;
  const allSubmitted = submittedCount >= totalPlayers && totalPlayers > 0;
  const capReached = submittedCount >= target && target > 0;

  return (
    <div className="screen">
      <header className="host-header">
        <span className="progress-label">
          Question {currentQuestionIndex + 1} of {questions.length}
        </span>
        <span className="category-badge">{currentQuestion.category}</span>
      </header>

      <div className="center-content">
        <div className="question-card">
          <QuestionText text={currentQuestion.text} />
        </div>

        <div className="submission-tracker">
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: `${pct}%` }} />
          </div>
          <p className="progress-label">
            {submittedCount} / {target} fibs submitted
            {target < totalPlayers && <span style={{ opacity: 0.6 }}> (cap: first {target})</span>}
          </p>
        </div>

        <div className="submitted-names">
          {players.map(p => (
            <span
              key={p.id}
              className={`player-dot ${submissions[p.id] ? 'done' : 'waiting'}`}
              style={{ background: submissions[p.id] ? p.color : undefined }}
              title={p.name}
            >
              {p.name[0].toUpperCase()}
            </span>
          ))}
        </div>

        <button
          className="btn btn-primary btn-lg"
          onClick={startVoting}
          disabled={submittedCount === 0}
        >
          {capReached ? '✅ Cap reached — Start Voting!' : allSubmitted ? '✅ All in — Start Voting!' : `Start Voting (${submittedCount} submitted)`}
        </button>
        {submittedCount === 0 && (
          <p className="hint-text">Waiting for at least one answer...</p>
        )}
      </div>
    </div>
  );
}
