import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  _resetNavigationProgressForTesting,
  finishNavigationProgress,
  getNavigationProgress,
  startNavigationProgress,
  subscribeNavigationProgress,
} from './navigationProgress';

describe('navigationProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    _resetNavigationProgressForTesting();
  });

  afterEach(() => {
    vi.useRealTimers();
    _resetNavigationProgressForTesting();
  });

  it('starts at 0% and hidden', () => {
    expect(getNavigationProgress()).toEqual({ progress: 0, visible: false });
  });

  it('starts progress at 20% and visible, then trickles forward', () => {
    startNavigationProgress();
    expect(getNavigationProgress().visible).toBe(true);
    expect(getNavigationProgress().progress).toBe(20);

    vi.advanceTimersByTime(200);
    expect(getNavigationProgress().progress).toBeGreaterThan(20);
    expect(getNavigationProgress().progress).toBeLessThanOrEqual(85);

    vi.advanceTimersByTime(1000);
    expect(getNavigationProgress().progress).toBeGreaterThan(50);
    expect(getNavigationProgress().progress).toBeLessThanOrEqual(85);
  });

  it('finishes by setting 100%, then fades out and resets', () => {
    startNavigationProgress();
    finishNavigationProgress();

    expect(getNavigationProgress()).toEqual({ progress: 100, visible: true });

    // After 200ms finish delay, visibility becomes false
    vi.advanceTimersByTime(200);
    expect(getNavigationProgress().visible).toBe(false);

    // After 250ms reset delay, progress resets to 0
    vi.advanceTimersByTime(250);
    expect(getNavigationProgress()).toEqual({ progress: 0, visible: false });
  });

  it('notifies subscribers on progress changes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeNavigationProgress(listener);

    startNavigationProgress();
    expect(listener).toHaveBeenCalled();

    const callCount = listener.mock.calls.length;
    vi.advanceTimersByTime(200);
    expect(listener.mock.calls.length).toBeGreaterThan(callCount);

    unsubscribe();
    const afterUnsubscribeCount = listener.mock.calls.length;
    vi.advanceTimersByTime(200);
    expect(listener.mock.calls.length).toBe(afterUnsubscribeCount);
  });

  it('auto-finishes after safety timeout', () => {
    startNavigationProgress();
    expect(getNavigationProgress().visible).toBe(true);

    // Fast-forward past 12s safety timeout
    vi.advanceTimersByTime(12000);
    expect(getNavigationProgress().progress).toBe(100);

    vi.advanceTimersByTime(500);
    expect(getNavigationProgress()).toEqual({ progress: 0, visible: false });
  });
});
