import React, {
  createContext, useContext, useState, useEffect, useRef, useCallback,
} from 'react';
import { ref, update, push, get, onChildAdded, remove, onDisconnect } from 'firebase/database';
import { getDb } from '../firebase';
import { sampleQuestions } from '../data/questions';

const GameContext = createContext();
export const useGame = () => useContext(GameContext);

// ── helpers ────────────────────────────────────────────────────────────────
const rand4 = () => Math.random().toString(36).substring(2, 6).toUpperCase();
const randId = () => Math.random().toString(36).substring(2, 10);

const SESSION_KEY = 'fibfest_session';
const saveSession = (gameCode, playerId, playerName) => {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ gameCode, playerId, playerName })); } catch {}
};
const loadSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
};
const clearSession = () => {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
};

// Firebase drops empty arrays/objects and converts arrays to objects on round-trip.
const toArray = (val) => {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') return Object.values(val);
  return [];
};

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

function getSubmissionCap(playerCount) {
  if (playerCount <= 10) return playerCount;
  return Math.max(10, Math.ceil(playerCount / 2));
}

function normalize(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

function areSimilar(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  if (na.length < 40 && nb.length < 40) {
    const dist = levenshtein(na, nb);
    const maxLen = Math.max(na.length, nb.length);
    if (maxLen > 0 && dist / maxLen <= 0.25) return true;
  }
  return false;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function mergeSimilarAnswers(fakeAnswers) {
  const groups = [];
  for (const ans of fakeAnswers) {
    let merged = false;
    for (const group of groups) {
      if (areSimilar(group.text, ans.text)) {
        group.authorIds.push(ans.authorId);
        merged = true;
        break;
      }
    }
    if (!merged) {
      groups.push({ text: ans.text, authorIds: [ans.authorId], isReal: false });
    }
  }
  return groups;
}

const MAX_PLAYERS = 30;

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
  role:                 null,
  phase:                PHASE.HOME,
  gameCode:             null,
  playerId:             null,
  playerName:           null,
  players:              [],
  questions:            sampleQuestions,
  totalQuestions:       10,
  currentQuestionIndex: 0,
  submissions:          {},
  shuffledAnswers:      [],
  votes:                {},
  roundResults:         null,
  scores:               {},
  roundScores:          {},
  error:                null,
  _currentQuestion:     null,
};

// ── provider ───────────────────────────────────────────────────────────────
export function GameProvider({ children }) {
  const [state, _setState] = useState(initState);
  const stateRef = useRef(state);
  // Store unsubscribe functions (not callbacks) for proper cleanup
  const unsubscribesRef = useRef([]);

  const setState = useCallback((updater) => {
    _setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      stateRef.current = next;
      return next;
    });
  }, []);

  // Clean up all Firebase listeners — call each unsubscribe function directly
  const cleanupListeners = useCallback(() => {
    unsubscribesRef.current.forEach(fn => {
      try { fn(); } catch {}
    });
    unsubscribesRef.current = [];
  }, []);

  // Helper: write game state to Firebase using update() to avoid null snapshots
  const writeGameState = useCallback((gameState) => {
    const code = gameState.gameCode || stateRef.current.gameCode;
    if (!code) return;

    const gameRef = ref(getDb(), `games/${code}/state`);
    const players = toArray(gameState.players);
    const questions = toArray(gameState.questions);
    const shuffled = toArray(gameState.shuffledAnswers);
    const idx = gameState.currentQuestionIndex ?? 0;

    // Use update() instead of set() — update() does NOT emit null snapshots
    update(gameRef, {
      phase:                gameState.phase,
      players:              players.length > 0 ? players : null,
      currentQuestionIndex: idx,
      submissions:          Object.keys(gameState.submissions || {}).length > 0 ? gameState.submissions : null,
      shuffledAnswers:      shuffled.length > 0 ? shuffled : null,
      votes:                Object.keys(gameState.votes || {}).length > 0 ? gameState.votes : null,
      roundResults:         gameState.roundResults || null,
      scores:               Object.keys(gameState.scores || {}).length > 0 ? gameState.scores : null,
      roundScores:          Object.keys(gameState.roundScores || {}).length > 0 ? gameState.roundScores : null,
      totalQuestions:       gameState.totalQuestions,
      questions:            questions,
      currentQuestion:      questions[idx] || null,
      // Monotonically increasing counter so players always see changes
      _seq:                 Date.now(),
    });
  }, []);

  // Host: update state locally and write to Firebase
  const hostUpdate = useCallback((updater) => {
    _setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      stateRef.current = next;
      writeGameState(next);
      return next;
    });
  }, [writeGameState]);

  // ── PUBLIC API ────────────────────────────────────────────────────────

  // Host: create a new game
  const createGame = useCallback((numQuestions = 10) => {
    const gameCode = rand4();
    const selected = shuffle(sampleQuestions).slice(0, Math.min(numQuestions, sampleQuestions.length));

    const newState = {
      ...initState,
      role: 'host',
      phase: PHASE.LOBBY,
      gameCode,
      questions: selected,
      totalQuestions: selected.length,
    };

    setState(newState);
    writeGameState(newState);

    // Listen for player actions (join, answer, vote)
    const actionsRef = ref(getDb(), `games/${gameCode}/actions`);
    const unsub = onChildAdded(actionsRef, (snapshot) => {
      const action = snapshot.val();
      if (!action) return;

      const s = stateRef.current;
      if (s.role !== 'host') return;

      if (action.type === 'JOIN') {
        const { playerId, name } = action;
        if (s.players.some(p => p.id === playerId)) return;

        hostUpdate(prev => {
          if (prev.players.some(p => p.id === playerId)) return prev;
          if (prev.players.length >= MAX_PLAYERS) return prev;
          const colorIndex = prev.players.length % PLAYER_COLORS.length;
          const newPlayers = [
            ...prev.players,
            { id: playerId, name, color: PLAYER_COLORS[colorIndex] },
          ];
          const newScores = { ...prev.scores, [playerId]: 0 };
          return { ...prev, players: newPlayers, scores: newScores };
        });
      }

      if (action.type === 'ANSWER') {
        const { playerId, answer } = action;
        hostUpdate(prev => {
          const newSubmissions = { ...prev.submissions, [playerId]: answer };
          const cap = getSubmissionCap(prev.players.length);
          const newCount = Object.keys(newSubmissions).length;

          if (newCount >= cap && prev.phase === PHASE.ANSWERING) {
            const q = prev.questions[prev.currentQuestionIndex];
            const fakeAnswers = Object.entries(newSubmissions).map(([authorId, text]) => ({
              text, authorId, isReal: false,
            }));
            const merged = mergeSimilarAnswers(fakeAnswers);
            const allAnswers = shuffle([
              ...merged,
              { text: q.answer, authorIds: ['host'], isReal: true },
            ]);
            return { ...prev, submissions: newSubmissions, phase: PHASE.VOTING, shuffledAnswers: allAnswers, votes: {} };
          }

          return { ...prev, submissions: newSubmissions };
        });
      }

      if (action.type === 'VOTE') {
        const { playerId, answerIndex } = action;
        hostUpdate(prev => ({
          ...prev,
          votes: { ...prev.votes, [playerId]: answerIndex },
        }));
      }

      if (action.type === 'LEAVE') {
        const { playerId } = action;
        hostUpdate(prev => {
          const newPlayers = prev.players.map(p =>
            p.id === playerId ? { ...p, disconnected: true } : p
          );
          return { ...prev, players: newPlayers };
        });
      }

      if (action.type === 'REJOIN') {
        const { playerId } = action;
        hostUpdate(prev => {
          const newPlayers = prev.players.map(p =>
            p.id === playerId ? { ...p, disconnected: false } : p
          );
          return { ...prev, players: newPlayers };
        });
      }

      remove(snapshot.ref);
    });

    unsubscribesRef.current.push(unsub);
  }, [setState, writeGameState, hostUpdate, cleanupListeners]);

  // Player: set up presence (onDisconnect only, no state syncing)
  const attachPlayerListeners = useCallback((code, playerId) => {
    const leaveRef = push(ref(getDb(), `games/${code}/actions`));
    onDisconnect(leaveRef).set({ type: 'LEAVE', playerId });
  }, []);

  // Player: join an existing game by code + name
  const joinGame = useCallback((gameCode, name) => {
    const code = gameCode.toUpperCase().trim();
    const playerId = randId();

    // Fetch game data once from Firebase
    const stateDbRef = ref(getDb(), `games/${code}/state`);
    get(stateDbRef).then(snapshot => {
      const remoteState = snapshot.val();
      if (!remoteState) {
        setState(prev => ({ ...prev, error: 'Game not found' }));
        return;
      }

      const questions = toArray(remoteState.questions);
      setState({
        ...initState,
        role: 'player',
        phase: PHASE.LOBBY,
        gameCode: code,
        playerId,
        playerName: name,
        questions,
        totalQuestions: remoteState.totalQuestions || questions.length,
        currentQuestionIndex: 0,
        scores: { [playerId]: 0 },
        _currentQuestion: questions[0] || null,
      });

      saveSession(code, playerId, name);

      // Send join action to host
      const actionsRef = ref(getDb(), `games/${code}/actions`);
      push(actionsRef, { type: 'JOIN', playerId, name });

      // Set up disconnect presence
      attachPlayerListeners(code, playerId);
    }).catch(() => {
      setState(prev => ({ ...prev, error: 'Could not connect to game' }));
    });
  }, [setState, attachPlayerListeners]);

  // Player: start playing (move from lobby to first question)
  const playerStartGame = useCallback(() => {
    setState(prev => ({ ...prev, phase: PHASE.ANSWERING }));
  }, [setState]);

  // Player: advance to the next question locally (no Firebase needed)
  const playerNextQuestion = useCallback(() => {
    setState(prev => {
      const nextIdx = prev.currentQuestionIndex + 1;
      if (nextIdx >= prev.totalQuestions) {
        return { ...prev, phase: PHASE.FINAL };
      }
      return {
        ...prev,
        phase: PHASE.ANSWERING,
        currentQuestionIndex: nextIdx,
        submissions: {},
        votes: {},
      };
    });
  }, [setState]);

  // Player: mark that voting is done (show "next question" screen)
  const playerDoneVoting = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'voted' }));
  }, [setState]);

  // Host: start the game
  const startGame = useCallback(() => {
    hostUpdate(prev => ({ ...prev, phase: PHASE.ANSWERING, currentQuestionIndex: 0, submissions: {} }));
  }, [hostUpdate]);

  // Player: submit an answer
  const submitAnswer = useCallback((answer) => {
    const { playerId, gameCode } = stateRef.current;
    const actionsRef = ref(getDb(), `games/${gameCode}/actions`);
    push(actionsRef, { type: 'ANSWER', playerId, answer: answer.trim() });
    setState(prev => ({ ...prev, submissions: { ...prev.submissions, [playerId]: answer.trim() } }));
  }, [setState]);

  // Host: move to voting phase
  const startVoting = useCallback(() => {
    hostUpdate(prev => {
      const q = prev.questions[prev.currentQuestionIndex];
      const fakeAnswers = Object.entries(prev.submissions).map(([authorId, text]) => ({
        text, authorId, isReal: false,
      }));
      const merged = mergeSimilarAnswers(fakeAnswers);
      const allAnswers = shuffle([
        ...merged,
        { text: q.answer, authorIds: ['host'], isReal: true },
      ]);
      return { ...prev, phase: PHASE.VOTING, shuffledAnswers: allAnswers, votes: {} };
    });
  }, [hostUpdate]);

  // Player: vote for an answer
  const submitVote = useCallback((answerIndex) => {
    const { playerId, gameCode } = stateRef.current;
    const actionsRef = ref(getDb(), `games/${gameCode}/actions`);
    push(actionsRef, { type: 'VOTE', playerId, answerIndex });
    setState(prev => ({ ...prev, votes: { ...prev.votes, [playerId]: answerIndex } }));
  }, [setState]);

  // Host: calculate scores and show results
  const showResults = useCallback(() => {
    hostUpdate(prev => {
      const { shuffledAnswers, votes, players, scores } = prev;

      const results = shuffledAnswers.map((ans, idx) => {
        const voters = players.filter(p => votes[p.id] === idx);
        return { ...ans, idx, voters };
      });

      const roundScores = {};
      players.forEach(p => { roundScores[p.id] = 0; });

      players.forEach(player => {
        const votedIdx = votes[player.id];
        if (votedIdx === undefined) return;
        const picked = shuffledAnswers[votedIdx];
        if (picked?.isReal) {
          roundScores[player.id] = (roundScores[player.id] || 0) + 1000;
        }
      });

      shuffledAnswers.forEach((ans, idx) => {
        if (ans.isReal) return;
        const fooled = players.filter(p => votes[p.id] === idx);
        if (fooled.length > 0) {
          const authors = ans.authorIds || (ans.authorId ? [ans.authorId] : []);
          authors.forEach(aid => {
            roundScores[aid] = (roundScores[aid] || 0) + fooled.length * 500;
          });
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
    hostUpdate(prev => ({
      ...prev,
      phase: PHASE.ANSWERING,
      submissions: {},
      shuffledAnswers: [],
      votes: {},
      roundResults: null,
      roundScores: {},
    }));
  }, [hostUpdate]);

  // Reset everything
  const resetGame = useCallback(() => {
    const { gameCode: code, role, playerId } = stateRef.current;
    cleanupListeners();
    clearSession();
    if (code && role === 'host') {
      remove(ref(getDb(), `games/${code}`));
    }
    if (code && role === 'player' && playerId) {
      push(ref(getDb(), `games/${code}/actions`), { type: 'LEAVE', playerId });
    }
    setState(initState);
  }, [setState, cleanupListeners]);

  // Check for saved session on mount
  const [pendingSession, setPendingSession] = useState(null);
  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    const { gameCode } = session;

    const stateDbRef = ref(getDb(), `games/${gameCode}/state`);
    get(stateDbRef).then(snapshot => {
      const remoteState = snapshot.val();
      if (!remoteState) {
        clearSession();
        return;
      }
      const players = toArray(remoteState.players);
      const me = players.find(p => p.id === session.playerId);
      if (!me) {
        clearSession();
        return;
      }
      setPendingSession(session);
    }).catch(() => {
      clearSession();
    });
  }, []);

  // Rejoin a pending session (called explicitly by user)
  const rejoinSession = useCallback(() => {
    if (!pendingSession) return;
    const { gameCode, playerId, playerName } = pendingSession;
    setPendingSession(null);

    const stateDbRef = ref(getDb(), `games/${gameCode}/state`);
    get(stateDbRef).then(snapshot => {
      const remoteState = snapshot.val();
      if (!remoteState) {
        clearSession();
        return;
      }

      const questions = toArray(remoteState.questions);
      setState({
        ...initState,
        role: 'player',
        phase: PHASE.LOBBY,
        gameCode,
        playerId,
        playerName,
        questions,
        totalQuestions: remoteState.totalQuestions || questions.length,
        currentQuestionIndex: 0,
        scores: { [playerId]: 0 },
        _currentQuestion: questions[0] || null,
      });

      push(ref(getDb(), `games/${gameCode}/actions`), { type: 'REJOIN', playerId });
      attachPlayerListeners(gameCode, playerId);
    }).catch(() => {
      clearSession();
      setPendingSession(null);
    });
  }, [pendingSession, setState, attachPlayerListeners]);

  // Dismiss pending session
  const dismissSession = useCallback(() => {
    clearSession();
    setPendingSession(null);
  }, []);

  // Admin: clear all games from Firebase
  const adminClearAllGames = useCallback(() => {
    remove(ref(getDb(), 'games'));
    clearSession();
    cleanupListeners();
    setState(initState);
    setPendingSession(null);
  }, [setState, cleanupListeners]);

  useEffect(() => {
    return () => cleanupListeners();
  }, [cleanupListeners]);

  // ── Player: poll Firebase for host state transitions ──────────────────
  useEffect(() => {
    if (state.role !== 'player' || !state.gameCode) return;

    const poll = async () => {
      try {
        const snap = await get(ref(getDb(), `games/${stateRef.current.gameCode}/state`));
        const remote = snap.val();
        if (!remote) return;

        const local = stateRef.current;

        // Player submitted answer, host moved to VOTING → pull shuffledAnswers
        if (
          local.phase === PHASE.ANSWERING &&
          local.submissions[local.playerId] &&
          remote.phase === PHASE.VOTING
        ) {
          setState(prev => ({
            ...prev,
            phase: PHASE.VOTING,
            shuffledAnswers: toArray(remote.shuffledAnswers),
          }));
          return;
        }

        // Player is voting or done voting → sync scores/results when host reveals
        if (
          (local.phase === PHASE.VOTING || local.phase === 'voted') &&
          (remote.phase === PHASE.RESULTS || remote.phase === PHASE.LEADERBOARD)
        ) {
          setState(prev => ({
            ...prev,
            // Keep 'voted' if player already voted; otherwise stay in VOTING
            phase: prev.phase === 'voted' ? 'voted' : prev.phase,
            roundResults: remote.roundResults ? toArray(remote.roundResults) : prev.roundResults,
            scores: remote.scores || prev.scores,
            roundScores: remote.roundScores || prev.roundScores,
            players: toArray(remote.players).length > 0 ? toArray(remote.players) : prev.players,
          }));
          return;
        }

        // Sync scores/players when player is on results/leaderboard screens
        if (local.phase === 'voted' || local.phase === PHASE.RESULTS || local.phase === PHASE.LEADERBOARD) {
          const remotePlayers = toArray(remote.players);
          if (remote.scores || remotePlayers.length > 0) {
            setState(prev => ({
              ...prev,
              scores: remote.scores || prev.scores,
              roundScores: remote.roundScores || prev.roundScores,
              roundResults: remote.roundResults ? toArray(remote.roundResults) : prev.roundResults,
              players: remotePlayers.length > 0 ? remotePlayers : prev.players,
            }));
          }
        }

        // Host reached FINAL → end game for player too
        if (remote.phase === PHASE.FINAL && local.phase !== PHASE.FINAL) {
          setState(prev => ({
            ...prev,
            phase: PHASE.FINAL,
            scores: remote.scores || prev.scores,
            players: toArray(remote.players).length > 0 ? toArray(remote.players) : prev.players,
          }));
        }
      } catch {}
    };

    // Poll immediately, then every 2 seconds
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [state.role, state.gameCode, state.phase, setState]);

  const submissionCap = getSubmissionCap(state.players.length);

  const value = {
    ...state,
    PHASE,
    MAX_PLAYERS,
    currentQuestion: state._currentQuestion || state.questions[state.currentQuestionIndex] || null,
    submittedCount: Object.keys(state.submissions).length,
    submissionCap,
    votedCount: Object.keys(state.votes).length,
    pendingSession,
    rejoinSession,
    dismissSession,
    adminClearAllGames,
    playerStartGame,
    playerNextQuestion,
    playerDoneVoting,
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