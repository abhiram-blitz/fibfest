import React from 'react';
import { useGame } from '../../context/GameContext';
import PlayerLobby from './PlayerLobby';
import PlayerAnswer from './PlayerAnswer';
import PlayerVote from './PlayerVote';
import PlayerResults from './PlayerResults';
import PlayerFinal from './PlayerFinal';
import PlayerWaiting from './PlayerWaiting';
import PlayerSync from './PlayerSync';

export default function PlayerApp() {
  const { phase, PHASE, currentQuestion } = useGame();

  // If we're in ANSWERING but have no question data, show sync button
  if (phase === PHASE.ANSWERING && !currentQuestion) {
    return <PlayerSync />;
  }

  switch (phase) {
    case PHASE.LOBBY:       return <PlayerLobby />;
    case PHASE.ANSWERING:   return <PlayerAnswer />;
    case PHASE.VOTING:      return <PlayerVote />;
    case PHASE.RESULTS:
    case PHASE.LEADERBOARD: return <PlayerResults />;
    case PHASE.FINAL:       return <PlayerFinal />;
    default:                return <PlayerSync />;
  }
}