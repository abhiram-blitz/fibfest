import React, {
  createContext, useContext, useState, useEffect, useRef, useCallback,
} from 'react';
import { sampleQuestions } from '../data/questions';

const GameContext = createContext();
export const useGame = () => useContext(GameContext);

// ── helpers ────────────────────────────────────────────────────────────────
const rand4 = () => Math.random().toString(36).substring(2, 6).toUpperCase();
const randId = () => Math.random().toString(36).substring(2, 10);

export const PLAYER_COLORS = [
  '#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff9f1c',
  '#a855f7','#06b6d4','#f97316','#84cc16','#ec4899',
  '#14b8a6','#f43f5e','#8b5cf6','#22c55e','#3b82f6',
  '#eab308','#ef4444','#10b981','#6366f1','#f59e0b',
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Message types sent over BroadcastChannel
const MSG = {
  STATE:        'STATE',        // host → players: full game state
  JOIN:         'JOIN',         // player → host: { name }
  ANSWER:       'ANSWER',       // player → host: { answer }
  VOTE:         'VOTE',         // player → host: { answerIndex }
  PING:         'PING',         // player → host: request latest state
};

const PHASE = {
  HOME:         'home',
  LOBBY:        'lobby',
  ANSWERING:    'answering',
  VOTING:       'voting',
  RESULTS:      'results',
  LEADERBOARD:  'leaderboard',
  FINAL:        'final',
};

const initState = {
  role:                 null,   // 'host' | 'player'
  phase:                PHASE.HOME,
  gameCode:             null,
  playerId:             null,
  playerName:           null,
  players:              [],     // [{ id, name, color }]
  questions:            sampleQuestions,
  totalQuestions:       10,     // how many questions to play
  currentQuestionIndex: 0,
  submissions:          {},     // { playerId: answerText }
  shuffledAnswers:      [],     // [{ text, authorId, isReal }]
  votes:                {},     // { playerId: answerIndex }
  roundResults:         null,
  scores:               {},     // { playerId: cumulativeScore }
  roundScores:          {},     // { playerId: pointsThisRound }
  error:                null,
};

// ── provider ───────────────────────────────────────────────────────────────
export function GameProvider({ children }) {
  const [state, _setState] = useState(initState);
  const stateRef = useRef(state);
  const channelRef = useRef(null);

  const setState = useCallback((updater) => {
    _setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      stateRef.current = next;
      return next;
    });
  }, []);

  // Broadcast full state to all players (host only)
  const broadcastState = useCallback((overrideState) => {
    const s = overrideState || stateRef.current;
    channelRef.current?.postMessage({ type: MSG.STATE, state: s });
  }, []);

  // Helper: host updates state and immediately broadcasts it
  const hostUpdate = useCallback((updater) => {
    _setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      stateRef.current = next;
      channelRef.current?.postMessage({ type: MSG.STATE, state: next });
      return next;
    });
  }, []);

  // ── message handlers ──────────────────────────────────────────────────
  const handleChannelMessage = useCallback((event) => {
    const { type, state: remoteState, ...payload } = event.data;
    const s = stateRef.current;

    if (type === MSG.STATE && s.role === 'player') {
      // Sync player state from host broadcast
      setState(prev => ({
        ...prev,
        phase:                remoteState.phase,
        players:              remoteState.players,
        currentQuestionIndex: remoteState.currentQuestionIndex,
        submissions:          remoteState.submissions,
        shuffledAnswers:      remoteState.shuffledAnswers,
        votes:                remoteState.votes,
        roundResults:         remoteState.roundResults,
        scores:               remoteState.scores,
        roundScores:          remoteState.roundScores,
        totalQuestions:       remoteState.totalQuestions,
        questions:            remoteState.questions,
      }));
      return;
    }

    if (s.role === 'host') {
      if (type === MSG.JOIN) {
        const { playerId, name } = payload;
        if (s.players.some(p => p.id === playerId)) {
          broadcastState(); // re-send state so they sync
          return;
        }
        hostUpdate(prev => {
          const colorIndex = prev.players.length % PLAYER_COLORS.length;
          const newPlayers = [
            ...prev.players,
            { id: playerId, name, color: PLAYER_COLORS[colorIndex] },
          ];
          const newScores = { ...prev.scores, [playerId]: 0 };
          return { ...prev, players: newPlayers, scores: newScores };
        });
        return;
      }

      if (type === MSG.ANSWER) {
        const { playerId, answer } = payload;
        hostUpdate(prev => ({
          ...prev,
          submissions: { ...prev.submissions, [playerId]: answer },
        }));
        return;
      }

      if (type === MSG.VOTE) {
        const { playerId, answerIndex } = payload;
        hostUpdate(prev => {
          const newVotes = { ...prev.votes, [playerId]: answerIndex };
          return { ...prev, votes: newVotes };
        });
        return;
      }

      if (type === MSG.PING) {
        broadcastState();
        return;
      }
    }
  }, [setState, hostUpdate, broadcastState]);

  // ── PUBLIC API ────────────────────────────────────────────────────────

  // Host: create a new game
  const createGame = useCallback((numQuestions = 10) => {
    const gameCode = rand4();
    const channel = new BroadcastChannel(`fibfest-${gameCode}`);
    channel.onmessage = handleChannelMessage;
    channelRef.current = channel;

    const selected = shuffle(sampleQuestions).slice(0, Math.min(numQuestions, sampleQuestions.length));

    setState({
      ...initState,
      role: 'host',
      phase: PHASE.LOBBY,
      gameCode,
      questions: selected,
      totalQuestions: selected.length,
    });
  }, [handleChannelMessage, setState]);

  // Player: join an existing game by code + name
  const joinGame = useCallback((gameCode, name) => {
    const code = gameCode.toUpperCase().trim();
    const playerId = randId();
    const channel = new BroadcastChannel(`fibfest-${code}`);
    channel.onmessage = handleChannelMessage;
    channelRef.current = channel;

    setState(prev => ({
      ...initState,
      role: 'player',
      phase: PHASE.LOBBY,
      gameCode: code,
      playerId,
      playerName: name,
      scores: { [playerId]: 0 },
    }));

    // Tell the host we joined
    channel.postMessage({ type: MSG.JOIN, playerId, name });

    // Request current state in case we're re-joining
    setTimeout(() => channel.postMessage({ type: MSG.PING }), 200);
  }, [handleChannelMessage, setState]);

  // Host: start the game
  const startGame = useCallback(() => {
    hostUpdate(prev => ({ ...prev, phase: PHASE.ANSWERING, currentQuestionIndex: 0, submissions: {} }));
  }, [hostUpdate]);

  // Player: submit a fake (or real) answer
  const submitAnswer = useCallback((answer) => {
    const { playerId } = stateRef.current;
    channelRef.current?.postMessage({ type: MSG.ANSWER, playerId, answer: answer.trim() });
    // Optimistic local update so the player sees "submitted"
    setState(prev => ({ ...prev, submissions: { ...prev.submissions, [playerId]: answer.trim() } }));
  }, [setState]);

  // Host: move to voting phase — compile all answers + real answer, shuffle
  const startVoting = useCallback(() => {
    hostUpdate(prev => {
      const q = prev.questions[prev.currentQuestionIndex];
      const fakeAnswers = Object.entries(prev.submissions).map(([authorId, text]) => ({
        text, authorId, isReal: false,
      }));
      const allAnswers = shuffle([
        ...fakeAnswers,
        { text: q.answer, authorId: 'host', isReal: true },
      ]);
      return { ...prev, phase: PHASE.VOTING, shuffledAnswers: allAnswers, votes: {} };
    });
  }, [hostUpdate]);

  // Player: vote for an answer by index
  const submitVote = useCallback((answerIndex) => {
    const { playerId } = stateRef.current;
    channelRef.current?.postMessage({ type: MSG.VOTE, playerId, answerIndex });
    setState(prev => ({ ...prev, votes: { ...prev.votes, [playerId]: answerIndex } }));
  }, [setState]);

  // Host: calculate scores and show results
  const showResults = useCallback(() => {
    hostUpdate(prev => {
      const { shuffledAnswers, votes, players, scores } = prev;

      // Build round results per answer
      const results = shuffledAnswers.map((ans, idx) => {
        const voters = players.filter(p => votes[p.id] === idx);
        return { ...ans, idx, voters };
      });

      // Calculate round scores
      const roundScores = {};
      players.forEach(p => { roundScores[p.id] = 0; });

      players.forEach(player => {
        const votedIdx = votes[player.id];
        if (votedIdx === undefined) return;
        const picked = shuffledAnswers[votedIdx];

        if (picked?.isReal) {
          // Correctly identified the real answer
          roundScores[player.id] = (roundScores[player.id] || 0) + 1000;
        }
      });

      // Award points to fib authors whose answer fooled people
      shuffledAnswers.forEach((ans, idx) => {
        if (ans.isReal) return;
        const fooled = players.filter(p => votes[p.id] === idx);
        if (fooled.length > 0) {
          roundScores[ans.authorId] = (roundScores[ans.authorId] || 0) + fooled.length * 500;
        }
      });

      const newScores = { ...scores };
      Object.keys(roundScores).forEach(pid => {
        newScores[pid] = (newScores[pid] || 0) + roundScores[pid];
      });

      return { ...prev, phase: PHASE.RESULTS, roundResults: results, roundScores, scores: newScores };
    });
  }, [hostUpdate]);

  // Host: advance to next question or end game
  const nextQuestion = useCallback(() => {
    hostUpdate(prev => {
      const nextIdx = prev.currentQuestionIndex + 1;
      if (nextIdx >= prev.questions.length) {
        return { ...prev, phase: PHASE.FINAL };
      }
      return {
        ...prev,
        phase: PHASE.ANSWERING,
        currentQuestionIndex: nextIdx,
        submissions: {},
        shuffledAnswers: [],
        votes: {},
        roundResults: null,
        roundScores: {},
      };
    });
  }, [hostUpdate]);

  // Host: show leaderboard mid-game
  const showLeaderboard = useCallback(() => {
    hostUpdate(prev => ({ ...prev, phase: PHASE.LEADERBOARD }));
  }, [hostUpdate]);

  // Return to answering from leaderboard
  const continueGame = useCallback(() => {
    hostUpdate(prev => ({ ...prev, phase: PHASE.ANSWERING }));
  }, [hostUpdate]);

  // Reset everything
  const resetGame = useCallback(() => {
    channelRef.current?.close();
    channelRef.current = null;
    setState(initState);
  }, [setState]);

  useEffect(() => {
    return () => channelRef.current?.close();
  }, []);

  const value = {
    ...state,
    PHASE,
    currentQuestion: state.questions[state.currentQuestionIndex],
    submittedCount: Object.keys(state.submissions).length,
    votedCount: Object.keys(state.votes).length,
    // actions
    createGame,
    joinGame,
    startGame,
    submitAnswer,
    startVoting,
    submitVote,
    showResults,
    nextQuestion,
    showLeaderboard,
    continueGame,
    resetGame,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
