import React, { useState } from 'react';
import { useGame } from '../context/GameContext';

export default function Home() {
  const { createGame, joinGame, error } = useGame();
  const [mode, setMode] = useState(null); // null | 'host' | 'join'
  const [joinCode, setJoinCode] = useState('');
  const [name, setName] = useState('');
  const [numQ, setNumQ] = useState(10);
  const [hostPin, setHostPin] = useState('');
  const [hostError, setHostError] = useState('');

  // SHA-256 hash of the host PIN (currently 8429)
  // To change: hash your new PIN and replace this value
  const HOST_PIN_HASH = 'f8e01d1b17e6402bd31cbdd545aa03cdc46b85a41ec92f69509aa3108f9b1255';

  async function hashPin(pin) {
    const data = new TextEncoder().encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const handleHost = async (e) => {
    e.preventDefault();
    const hashed = await hashPin(hostPin);
    if (hashed !== HOST_PIN_HASH) {
      setHostError('Incorrect host PIN');
      return;
    }
    setHostError('');
    createGame(numQ);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (joinCode.length < 4 || !name.trim()) return;
    joinGame(joinCode, name.trim());
  };

  if (mode === 'host') {
    return (
      <div className="screen center">
        <div className="card" style={{ maxWidth: 420 }}>
          <button className="btn-ghost back-btn" onClick={() => setMode(null)}>← Back</button>
          <h2 className="card-title">Host a Game</h2>
          <form onSubmit={handleHost} className="form-stack">
            <label className="form-label">
              Host PIN
              <input
                className="input input-code"
                type="password"
                placeholder="••••"
                value={hostPin}
                onChange={e => { setHostPin(e.target.value.slice(0, 4)); setHostError(''); }}
                maxLength={4}
                autoFocus
                required
              />
            </label>
            <label className="form-label">
              Questions to play
              <select
                className="input"
                value={numQ}
                onChange={e => setNumQ(Number(e.target.value))}
              >
                {[5, 8, 10, 15, 20].map(n => (
                  <option key={n} value={n}>{n} questions</option>
                ))}
              </select>
            </label>
            {hostError && <p className="error-text">{hostError}</p>}
            <button type="submit" className="btn btn-primary btn-lg" disabled={hostPin.length < 4}>
              Create Game
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="screen center">
        <div className="card" style={{ maxWidth: 420 }}>
          <button className="btn-ghost back-btn" onClick={() => setMode(null)}>← Back</button>
          <h2 className="card-title">Join a Game</h2>
          <form onSubmit={handleJoin} className="form-stack">
            <label className="form-label">
              Your name
              <input
                className="input"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={20}
                autoFocus
                required
              />
            </label>
            <label className="form-label">
              Game code
              <input
                className="input input-code"
                type="text"
                placeholder="XXXX"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                maxLength={4}
                required
              />
            </label>
            {error && <p className="error-text">{error}</p>}
            <button
              type="submit"
              className="btn btn-secondary btn-lg"
              disabled={joinCode.length < 4 || !name.trim()}
            >
              Join Game
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="screen center">
      <div className="home-hero">
        <div className="logo-wrap">
          <span className="logo-icon">🎭</span>
          <h1 className="logo-title">FibFest</h1>
        </div>
        <p className="tagline">Lie. Guess. Fool your friends.</p>

        <div className="home-actions">
          <button className="btn btn-primary btn-xl" onClick={() => setMode('host')}>
            🎮 Host a Game
          </button>
          <button className="btn btn-secondary btn-xl" onClick={() => setMode('join')}>
            🙋 Join a Game
          </button>
        </div>

        <div className="how-to-play">
          <h3>How to play</h3>
          <ol>
            <li>Host creates a game and shares the 4-letter code</li>
            <li>Players join on their own devices with the code</li>
            <li>Everyone writes a fake answer to trick others</li>
            <li>Vote for the answer you think is real</li>
            <li>Score points for fooling friends — or spotting the truth!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
