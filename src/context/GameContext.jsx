import React, {
  createContext, useContext, useState, useEffect, useRef, useCallback,
} from 'react';
import { ref, set, push, onValue, onChildAdded, off, remove, onDisconnect } from 'firebase/database';
import { db } from '../firebase';
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

// Submission cap: all players if ≤10, otherwise max(10, half)
function getSubmissionCap(playerCount) {
  if (playerCount <= 10) return playerCount;
  return Math.max(10, Math.ceil(playerCount / 2));
}

// Simple string similarity (normalized Levenshtein-ish)
function normalize(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

function areSimilar(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  // One contains the other
  if (na.includes(nb) || nb.includes(na)) return true;
  // Levenshtein distance for short strings
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

// Group similar answers, keeping the first one as representative
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
};

// ── provider ───────────────────────────────────────────────────────────────
export function GameProvider({ children }) {
  const [state, _setState] = useState(initState);
  const stateRef = useRef(state);
  const listenersRef = useRef([]);

  const setState = useCallback((updater) => {
    _setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      stateRef.current = next;
      return next;
    });
  }, []);

  // Clean up all Firebase listeners and event handlers
  const cleanupListeners = useCallback(() => {
    listenersRef.current.forEach((listener) => {
      if (listener.dbRef) off(listener.dbRef, 'value', listener.callback);
      if (listener.cleanup) listener.cleanup();
    });
    listenersRef.current = [];
  }, []);

  // Helper: write game state to Firebase (host only)
  const writeGameState = useCallback((gameState) => {
    const code = gameState.gameCode || stateRef.current.gameCode;
    if (!code) return;

    const gameRef = ref(db, `games/${code}/state`);
    // Write only the shared state (not role/playerId/playerName which are local)
    set(gameRef, {
      phase:                gameState.phase,
      players:              gameState.players || [],
      currentQuestionIndex: gameState.currentQuestionIndex,
      submissions:          gameState.submissions || {},
      shuffledAnswers:      gameState.shuffledAnswers || [],
      votes:                gameState.votes || {},
      roundResults:         gameState.roundResults || null,
      scores:               gameState.scores || {},
      roundScores:          gameState.roundScores || {},
      totalQuestions:       gameState.totalQuestions,
      questions:            gameState.questions,
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

    // Write initial state to Firebase
    writeGameState(newState);

    // Listen for player actions (join, answer, vote)
    const actionsRef = ref(db, `games/${gameCode}/actions`);
    const handleAction = onChildAdded(actionsRef, (snapshot) => {
      const action = snapshot.val();
      if (!action) return;

      const s = stateRef.current;
      if (s.role !== 'host') return;

      if (action.type === 'JOIN') {
        const { playerId, name } = action;
        if (s.players.some(p => p.id === playerId)) return;

        hostUpdate(prev => {
          // Double-check inside updater to avoid race conditions
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

          // Auto-close submissions when cap is reached
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
          const newPlayers = prev.players.filter(p => p.id !== playerId);
          const newScores = { ...prev.scores };
          delete newScores[playerId];
          const newSubmissions = { ...prev.submissions };
          delete newSubmissions[playerId];
          const newVotes = { ...prev.votes };
          delete newVotes[playerId];
          return { ...prev, players: newPlayers, scores: newScores, submissions: newSubmissions, votes: newVotes };
        });
      }

      // Remove processed action
      remove(snapshot.ref);
    });

    listenersRef.current.push({ dbRef: actionsRef, callback: handleAction });
  }, [setState, writeGameState, hostUpdate, cleanupListeners]);

  // Player: join an existing game by code + name
  const joinGame = useCallback((gameCode, name) => {
    const code = gameCode.toUpperCase().trim();
    const playerId = randId();

    setState(prev => ({
      ...initState,
      role: 'player',
      phase: PHASE.LOBBY,
      gameCode: code,
      playerId,
      playerName: name,
      scores: { [playerId]: 0 },
    }));

    // Send join action to host via Firebase
    const actionsRef = ref(db, `games/${code}/actions`);
    push(actionsRef, { type: 'JOIN', playerId, name });

    // Set up onDisconnect to notify host if player loses connection
    const leaveRef = push(ref(db, `games/${code}/actions`));
    onDisconnect(leaveRef).set({ type: 'LEAVE', playerId });

    // Also send LEAVE on tab close / navigation
    const handleBeforeUnload = () => {
      push(ref(db, `games/${code}/actions`), { type: 'LEAVE', playerId });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    listenersRef.current.push({ cleanup: () => window.removeEventListener('beforeunload', handleBeforeUnload) });

    // Listen for game state updates from host
    const stateDbRef = ref(db, `games/${code}/state`);
    const handleState = onValue(stateDbRef, (snapshot) => {
      const remoteState = snapshot.val();
      if (!remoteState) return;

      setState(prev => {
        if (prev.role !== 'player') return prev;
        return {
          ...prev,
          phase:                remoteState.phase,
          players:              remoteState.players || [],
          currentQuestionIndex: remoteState.currentQuestionIndex,
          submissions:          remoteState.submissions || {},
          shuffledAnswers:      remoteState.shuffledAnswers || [],
          votes:                remoteState.votes || {},
          roundResults:         remoteState.roundResults || null,
          scores:               remoteState.scores || {},
          roundScores:          remoteState.roundScores || {},
          totalQuestions:       remoteState.totalQuestions,
          questions:            remoteState.questions,
        };
      });
    });

    listenersRef.current.push({ dbRef: stateDbRef, callback: handleState });
  }, [setState, cleanupListeners]);

  // Host: start the game
  const startGame = useCallback(() => {
    hostUpdate(prev => ({ ...prev, phase: PHASE.ANSWERING, currentQuestionIndex: 0, submissions: {} }));
  }, [hostUpdate]);

  // Player: submit an answer
  const submitAnswer = useCallback((answer) => {
    const { playerId, gameCode } = stateRef.current;
    const actionsRef = ref(db, `games/${gameCode}/actions`);
    push(actionsRef, { type: 'ANSWER', playerId, answer: answer.trim() });
    // Optimistic local update
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
    const actionsRef = ref(db, `games/${gameCode}/actions`);
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
          // authorIds is an array (merged similar answers share credit)
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

  // Return to answering from leaderboard (keep current question state intact)
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
    if (code && role === 'host') {
      remove(ref(db, `games/${code}`));
    }
    if (code && role === 'player' && playerId) {
      push(ref(db, `games/${code}/actions`), { type: 'LEAVE', playerId });
    }
    setState(initState);
  }, [setState, cleanupListeners]);

  useEffect(() => {
    return () => cleanupListeners();
  }, [cleanupListeners]);

  const submissionCap = getSubmissionCap(state.players.length);

  const value = {
    ...state,
    PHASE,
    MAX_PLAYERS,
    currentQuestion: state.questions[state.currentQuestionIndex],
    submittedCount: Object.keys(state.submissions).length,
    submissionCap,
    votedCount: Object.keys(state.votes).length,
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
