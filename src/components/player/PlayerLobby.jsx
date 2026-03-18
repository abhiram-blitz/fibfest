import { useState } from 'react';
import { ref, get } from 'firebase/database';
import { getDb } from '../../firebase';
import { useGame } from '../../context/GameContext';

export default function PlayerLobby() {
  const { playerName, gameCode, resetGame, playerStartGame } = useGame();
  const [status, setStatus] = useState('idle'); // idle | checking | waiting

  const handleStart = async () => {
    setStatus('checking');
    try {
      const snap = await get(ref(getDb(), `games/${gameCode}/state`));
      const remote = snap.val();
      if (remote && remote.phase !== 'lobby') {
        playerStartGame();
      } else {
        setStatus('waiting');
        setTimeout(() => setStatus('idle'), 2500);
      }
    } catch {
      setStatus('idle');
    }
  };

  return (
    <div className="screen center">
      <div className="card" style={{ maxWidth: 380, textAlign: 'center' }}>
        <button className="btn-ghost back-btn" onClick={resetGame}>← Leave</button>

        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎭</div>
        <h2 className="card-title">{playerName}</h2>
        <p className="hint-text">You're in game <strong>{gameCode}</strong></p>

        <p className="hint-text" style={{ marginTop: '1.5rem' }}>
          Wait for the host to start the game, then tap below.
        </p>

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%', marginTop: '1rem' }}
          onClick={handleStart}
          disabled={status === 'checking'}
        >
          {status === 'checking' ? 'Checking...' : 'Start Playing'}
        </button>

        {status === 'waiting' && (
          <p className="hint-text" style={{ marginTop: '0.5rem', color: 'var(--muted)' }}>
            Host hasn't started yet — try again in a moment.
          </p>
        )}
      </div>
    </div>
  );
}