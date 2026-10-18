// Global navigation progress bar state and controls for page transitions.
// Tracks client-side transitions and exposes a subscribe API for React's useSyncExternalStore.

type Listener = () => void;

export interface NavigationProgressState {
  progress: number;
  visible: boolean;
}

let state: NavigationProgressState = { progress: 0, visible: false };
const listeners = new Set<Listener>();

let trickleTimer: ReturnType<typeof setInterval> | null = null;
let finishTimer: ReturnType<typeof setTimeout> | null = null;
let resetTimer: ReturnType<typeof setTimeout> | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function getNavigationProgress(): NavigationProgressState {
  return state;
}

export function subscribeNavigationProgress(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function startNavigationProgress() {
  if (finishTimer) {
    clearTimeout(finishTimer);
    finishTimer = null;
  }
  if (resetTimer) {
    clearTimeout(resetTimer);
    resetTimer = null;
  }
  if (safetyTimer) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }

  // If already navigating, let the existing progress continue crawling
  if (state.visible && state.progress > 0) {
    return;
  }

  state = { visible: true, progress: 20 };
  notify();

  if (trickleTimer) clearInterval(trickleTimer);
  trickleTimer = setInterval(() => {
    if (state.progress < 85) {
      // Crawl forward with diminishing increments
      const step = Math.max((85 - state.progress) * 0.12, 1.2);
      state = { ...state, progress: Math.min(85, state.progress + step) };
      notify();
    }
  }, 200);

  // Safety timer so the bar never gets stuck if navigation is aborted
  safetyTimer = setTimeout(() => {
    finishNavigationProgress();
  }, 12000);
}

export function finishNavigationProgress() {
  if (!state.visible && state.progress === 0) return;

  if (trickleTimer) {
    clearInterval(trickleTimer);
    trickleTimer = null;
  }
  if (safetyTimer) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }

  // Rapidly sweep to 100%
  state = { visible: true, progress: 100 };
  notify();

  if (finishTimer) clearTimeout(finishTimer);
  finishTimer = setTimeout(() => {
    state = { ...state, visible: false };
    notify();

    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      state = { visible: false, progress: 0 };
      notify();
    }, 250);
  }, 200);
}

// For testing: resets all module state and active timers
export function _resetNavigationProgressForTesting() {
  if (trickleTimer) {
    clearInterval(trickleTimer);
    trickleTimer = null;
  }
  if (finishTimer) {
    clearTimeout(finishTimer);
    finishTimer = null;
  }
  if (resetTimer) {
    clearTimeout(resetTimer);
    resetTimer = null;
  }
  if (safetyTimer) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
  state = { progress: 0, visible: false };
  listeners.clear();
}
