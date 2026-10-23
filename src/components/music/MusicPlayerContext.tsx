'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { type MusicRankingEntry, SEED_MUSIC_RANKINGS, getLandingPageOrderedRankings } from '@/lib/music';

export type PlaybackMode = 'preview' | 'full';

export interface MusicPlayerState {
  currentTrack: MusicRankingEntry | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  volume: number;
  isMuted: boolean;
  playbackMode: PlaybackMode;
  showFullPlayer: boolean;
  playlist: MusicRankingEntry[];
  setPlaylist: (tracks: MusicRankingEntry[]) => void;
  continuePlaying: boolean;
  setContinuePlaying: (value: boolean | ((prev: boolean) => boolean)) => void;
  setShowFullPlayer: (show: boolean) => void;
  setPlaybackMode: (mode: PlaybackMode) => void;
  playTrack: (track: MusicRankingEntry, queue?: MusicRankingEntry[]) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  playFullTrack: (track?: MusicRankingEntry) => void;
  togglePlay: (track?: MusicRankingEntry, queue?: MusicRankingEntry[]) => void;
  pause: () => void;
  resume: () => void;
  seek: (ratio: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  closePlayer: () => void;
}

const CROSSFADE_SECONDS = 2;

const MusicPlayerContext = createContext<MusicPlayerState | null>(null);

/**
 * Fallback synthesizer using Web Audio API in case external preview stream
 * is blocked by network filters or encounters a transient decoding error.
 */
function playFallbackSynth(onEnd: () => void): () => void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      onEnd();
      return () => {};
    }
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    // Pleasant melodic sequence: C4, E4, G4, B4, C5, G4, E4, C4
    const notes = [261.63, 329.63, 392.0, 493.88, 523.25, 392.0, 329.63, 261.63];
    const duration = 0.35;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * duration);

      gain.gain.setValueAtTime(0, now + idx * duration);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * duration + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * duration + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * duration);
      osc.stop(now + idx * duration + duration);
    });

    const timer = setTimeout(() => {
      onEnd();
      try {
        ctx.close();
      } catch {
        // noop
      }
    }, notes.length * duration * 1000);

    return () => {
      clearTimeout(timer);
      try {
        ctx.close();
      } catch {
        // noop
      }
    };
  } catch {
    onEnd();
    return () => {};
  }
}

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<MusicRankingEntry | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('preview');
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [playlist, setPlaylist] = useState<MusicRankingEntry[]>(() =>
    getLandingPageOrderedRankings(SEED_MUSIC_RANKINGS),
  );
  const [continuePlaying, setContinuePlayingState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('chronopin_continue_playing');
        if (saved !== null) return saved === 'true';
      } catch {
        // ignore
      }
    }
    return true;
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fallbackCleanupRef = useRef<(() => void) | null>(null);
  const nextTrackRef = useRef<() => void>(() => {});
  const prevTrackRef = useRef<() => void>(() => {});
  const continuePlayingRef = useRef(continuePlaying);
  const currentTrackRef = useRef<MusicRankingEntry | null>(null);
  const playlistRef = useRef<MusicRankingEntry[]>([]);
  const playbackModeRef = useRef<PlaybackMode>('preview');
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  currentTrackRef.current = currentTrack;
  playlistRef.current = playlist;
  playbackModeRef.current = playbackMode;
  volumeRef.current = volume;
  isMutedRef.current = isMuted;

  const setContinuePlaying = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    setContinuePlayingState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      continuePlayingRef.current = next;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('chronopin_continue_playing', String(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    continuePlayingRef.current = continuePlaying;
  }, [continuePlaying]);

  // Setup the HTMLAudioElement; a second one is created per crossfade and takes over as audioRef
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const bindAudio = (audio: HTMLAudioElement) => {
      const isActive = () => audioRef.current === audio;
      const handlePlay = () => isActive() && setIsPlaying(true);
      const handlePause = () => isActive() && setIsPlaying(false);
      const handleTimeUpdate = () => {
        if (!isActive()) return;
        setCurrentTime(audio.currentTime);
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      };
      const handleLoadedMetadata = () => {
        if (isActive() && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      };
      const handleEnded = () => {
        if (!isActive()) return;
        setIsPlaying(false);
        setCurrentTime(0);
        if (continuePlayingRef.current) {
          nextTrackRef.current();
        }
      };
      const handleError = () => {
        if (!isActive()) return;
        // If native stream fails (e.g. adblocker or restricted network), trigger soft fallback melody
        console.warn('Audio stream playback failed, activating acoustic preview fallback.');
        setIsPlaying(true);
        setCurrentTime(0);
        setDuration(4);

        const cleanup = fallbackCleanupRef.current;
        if (cleanup) {
          fallbackCleanupRef.current = null;
          cleanup();
        }
        fallbackCleanupRef.current = playFallbackSynth(() => {
          setIsPlaying(false);
          setCurrentTime(0);
        });
      };

      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      return () => {
        audio.pause();
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };
    };

    const unbinders = new Set<() => void>();
    const createAudio = () => {
      const audio = new Audio();
      audio.preload = 'auto';
      const unbind = bindAudio(audio);
      unbinders.add(unbind);
      return { audio, unbind };
    };

    const first = createAudio();
    audioRef.current = first.audio;
    let activeUnbind = first.unbind;
    let fadeTimer: ReturnType<typeof setInterval> | null = null;
    let fadeAttemptedFor: HTMLAudioElement | null = null;

    // Fade the outgoing preview out over the last CROSSFADE_SECONDS while the next one fades in
    const crossfadeToNext = (outgoing: HTMLAudioElement) => {
      const list = playlistRef.current;
      const current = currentTrackRef.current;
      if (!list.length || !current) return;
      const idx = list.findIndex((t) => t.id === current.id);
      const next = list[idx === -1 ? 0 : (idx + 1) % list.length];
      if (!next.audioUrl || next.id === current.id) return;

      const incoming = createAudio();
      incoming.audio.src = next.audioUrl;
      incoming.audio.volume = 0;
      const outgoingUnbind = activeUnbind;
      activeUnbind = incoming.unbind;
      audioRef.current = incoming.audio;
      fadeAttemptedFor = incoming.audio;
      setCurrentTrack(next);
      setCurrentTime(0);
      setDuration(30);
      incoming.audio.play().catch((err) => {
        console.warn('Autoplay refused or audio source error:', err);
      });

      const target = () => (isMutedRef.current ? 0 : volumeRef.current);
      const startedAt = performance.now();
      const startVolume = outgoing.volume;
      if (fadeTimer) clearInterval(fadeTimer);
      fadeTimer = setInterval(() => {
        const t = Math.min(1, (performance.now() - startedAt) / (CROSSFADE_SECONDS * 1000));
        outgoing.volume = Math.max(0, startVolume * (1 - t));
        if (audioRef.current === incoming.audio) incoming.audio.volume = target() * t;
        if (t >= 1) {
          if (fadeTimer) clearInterval(fadeTimer);
          fadeTimer = null;
          outgoingUnbind();
          unbinders.delete(outgoingUnbind);
        }
      }, 16);
    };

    const watchTimer = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || audio === fadeAttemptedFor || audio.paused) return;
      if (playbackModeRef.current !== 'preview' || !continuePlayingRef.current) return;
      const d = audio.duration;
      if (!d || !isFinite(d)) return;
      if (d - audio.currentTime <= CROSSFADE_SECONDS) {
        fadeAttemptedFor = audio;
        crossfadeToNext(audio);
      }
    }, 40);

    return () => {
      clearInterval(watchTimer);
      if (fadeTimer) clearInterval(fadeTimer);
      unbinders.forEach((unbind) => unbind());
      unbinders.clear();
      const cleanup = fallbackCleanupRef.current;
      if (cleanup) {
        fallbackCleanupRef.current = null;
        cleanup();
      }
    };
  }, []);

  // Update MediaSession metadata for OS lockscreen & notification integration
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator) || !currentTrack) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: `${currentTrack.chartName} (#${currentTrack.rank}, ${currentTrack.year})`,
        artwork: [
          { src: currentTrack.artworkUrl, sizes: '512x512', type: 'image/jpeg' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play().catch(() => {});
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime != null && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
        }
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        prevTrackRef.current();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        nextTrackRef.current();
      });
    } catch {
      // MediaSession might be unsupported in some environments
    }
  }, [currentTrack]);

  // Keep volume synced with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const stopFallback = () => {
    const cleanup = fallbackCleanupRef.current;
    if (cleanup) {
      fallbackCleanupRef.current = null;
      cleanup();
    }
  };

  const playTrack = useCallback((track: MusicRankingEntry, queue?: MusicRankingEntry[]) => {
    if (!audioRef.current) return;

    if (queue && queue.length > 0) {
      setPlaylist(queue);
    }

    stopFallback();
    setPlaybackMode('preview');
    setShowFullPlayer(false);

    if (currentTrack?.id === track.id && playbackMode === 'preview') {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {});
      }
      return;
    }

    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(30);

    const src = track.audioUrl || '';
    if (src) {
      audioRef.current.src = src;
      try {
        if (audioRef.current.currentTime !== 0) {
          audioRef.current.currentTime = 0;
        }
      } catch {
        // Ignored: readyState reset already sets currentTime to 0 per HTML5 spec
      }
      audioRef.current.play().catch((err) => {
        console.warn('Autoplay refused or audio source error:', err);
      });
    } else {
      // Fallback synthesizer
      setIsPlaying(true);
      stopFallback();
      fallbackCleanupRef.current = playFallbackSynth(() => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
    }
  }, [currentTrack, isPlaying, playbackMode]);

  const nextTrack = useCallback(() => {
    if (!playlist.length) return;
    const currentIndex = playlist.findIndex((t) => t.id === currentTrack?.id);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % playlist.length;
    playTrack(playlist[nextIndex]);
  }, [currentTrack, playlist, playTrack]);

  const prevTrack = useCallback(() => {
    if (!playlist.length) return;
    const currentIndex = playlist.findIndex((t) => t.id === currentTrack?.id);
    const prevIndex =
      currentIndex === -1 ? playlist.length - 1 : (currentIndex - 1 + playlist.length) % playlist.length;
    playTrack(playlist[prevIndex]);
  }, [currentTrack, playlist, playTrack]);

  useEffect(() => {
    nextTrackRef.current = nextTrack;
    prevTrackRef.current = prevTrack;
  }, [nextTrack, prevTrack]);

  const playFullTrack = useCallback((track?: MusicRankingEntry) => {
    const target = track || currentTrack;
    if (!target) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }
    stopFallback();

    setCurrentTrack(target);
    setPlaybackMode('full');
    setShowFullPlayer(true);
    setIsPlaying(true);
  }, [currentTrack]);

  const togglePlay = useCallback(
    (track?: MusicRankingEntry, queue?: MusicRankingEntry[]) => {
      if (queue && queue.length > 0) {
        setPlaylist(queue);
      }

      if (playbackMode === 'full') {
        if (track && track.id !== currentTrack?.id) {
          playFullTrack(track);
        } else {
          setShowFullPlayer((prev) => !prev);
        }
        return;
      }

      if (track && track.id !== currentTrack?.id) {
        playTrack(track, queue);
        return;
      }

      if (!audioRef.current) return;

      if (isPlaying) {
        audioRef.current.pause();
        stopFallback();
        setIsPlaying(false);
      } else {
        if (currentTrack) {
          audioRef.current.play().catch(() => {});
        } else if (track) {
          playTrack(track, queue);
        }
      }
    },
    [currentTrack, isPlaying, playbackMode, playFullTrack, playTrack],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    stopFallback();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    if (playbackMode === 'full') {
      setShowFullPlayer(true);
      setIsPlaying(true);
    } else if (currentTrack && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [currentTrack, playbackMode]);

  const seek = useCallback((ratio: number) => {
    if (!audioRef.current) return;
    const boundedRatio = Math.max(0, Math.min(1, ratio));
    const targetTime = boundedRatio * (duration || 30);
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  }, [duration]);

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const closePlayer = useCallback(() => {
    audioRef.current?.pause();
    stopFallback();
    setIsPlaying(false);
    setCurrentTrack(null);
    setCurrentTime(0);
    setShowFullPlayer(false);
  }, []);

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <MusicPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        progress,
        volume,
        isMuted,
        playbackMode,
        showFullPlayer,
        playlist,
        setPlaylist,
        continuePlaying,
        setContinuePlaying,
        setShowFullPlayer,
        setPlaybackMode,
        playTrack,
        nextTrack,
        prevTrack,
        playFullTrack,
        togglePlay,
        pause,
        resume,
        seek,
        setVolume,
        toggleMute,
        closePlayer,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer(): MusicPlayerState {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
}
