import React from 'react';
import { useGame } from '../../context/GameContext';
import PlayerLobby from './PlayerLobby';
import PlayerAnswer from './PlayerAnswer';
import PlayerVote from './PlayerVote';
import PlayerFinal from './PlayerFinal';
import PlayerNextRound from './PlayerNextRound';

export default function PlayerApp() {
  const { phase, PHASE } = useGame();

  switch (phase) {
    case PHASE.LOBBY:     return <PlayerLobby />;
    case PHASE.ANSWERING: return <PlayerAnswer />;
    case PHASE.VOTING:    return <PlayerVote />;
    case 'voted':         return <PlayerNextRound />;
    case PHASE.FINAL:     return <PlayerFinal />;
    default:              return <PlayerNextRound />;
  }
}