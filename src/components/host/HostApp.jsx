import React from 'react';
import { useGame } from '../../context/GameContext';
import HostLobby from './HostLobby';
import HostAnswering from './HostAnswering';
import HostVoting from './HostVoting';
import HostResults from './HostResults';
import HostFinal from './HostFinal';
import Scoreboard from '../shared/Scoreboard';

export default function HostApp() {
  const { phase, PHASE } = useGame();

  switch (phase) {
    case PHASE.LOBBY:       return <HostLobby />;
    case PHASE.ANSWERING:   return <HostAnswering />;
    case PHASE.VOTING:      return <HostVoting />;
    case PHASE.RESULTS:     return <HostResults />;
    case PHASE.LEADERBOARD: return <Scoreboard />;
    case PHASE.FINAL:       return <HostFinal />;
    default:                return null;
  }
}
