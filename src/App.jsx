import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Home from './components/Home';
import HostApp from './components/host/HostApp';
import PlayerApp from './components/player/PlayerApp';

function GameRouter() {
  const { role } = useGame();
  if (role === 'host') return <HostApp />;
  if (role === 'player') return <PlayerApp />;
  return <Home />;
}

export default function App() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}
