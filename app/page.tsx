'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './page.module.css';
import type { StreamResponse, Track } from '@/lib/types';

const STARTER_QUERY = 'lofi hip hop';

// ─── SVG Icons ───────────────────────────────────────────────
const PlayIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const PauseIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
const SkipForwardIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>;
const SkipBackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>;
const SearchIconSVG = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const HomeIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const CompassIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>;
const LibraryIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></svg>;
const ChevronDownIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>;
const VolumeHighIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;
const VolumeLowIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;
const VolumeMuteIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>;
const ShuffleIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>;
const RepeatIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
const RepeatOneIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><text x="11" y="15" fill="currentColor" stroke="none" fontSize="8" fontWeight="bold">1</text></svg>;
const QueueIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const CloseIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

type RepeatMode = 'off' | 'all' | 'one';

function formatClock(time: number) {
  if (!Number.isFinite(time) || time < 0) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

// ─── Main Page ───────────────────────────────────────────────
export default function HomePage() {
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const streamCacheRef = useRef<Map<string, StreamResponse>>(new Map());
  const requestIdRef = useRef(0);
  const suggestionsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingStream, setLoadingStream] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Volume
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);

  // Shuffle & Repeat
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');

  // UI state
  const [fsOpen, setFsOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [greeting] = useState(getGreeting);

  const madeForYou = useMemo(() => results.slice(0, 6), [results]);
  const trendingNow = useMemo(() => results.slice(6, 12), [results]);
  const allTracks = useMemo(() => results.slice(12), [results]);

  // ─── Audio helpers ─────────────────────────────────────────
  async function playAudioElement() {
    if (!currentAudioRef.current) return false;
    try {
      await currentAudioRef.current.play();
      setIsPlaying(true);
      return true;
    } catch {
      setIsPlaying(false);
      return false;
    }
  }

  async function fetchStream(track: Track) {
    const cached = streamCacheRef.current.get(track.id);
    if (cached && cached.expiresAt > Date.now()) return cached;

    const response = await fetch(`/api/stream?id=${encodeURIComponent(track.id)}`);
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || 'Playback failed.');
    }

    streamCacheRef.current.set(track.id, data);
    return data;
  }

  // ─── Search ────────────────────────────────────────────────
  async function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();
    if (!trimmed) return;

    setLoadingSearch(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Search failed.');
      }

      setResults(data.tracks);

      if (!selectedTrack && data.tracks.length > 0) {
        setSelectedTrack(data.tracks[0]);
        setDuration(data.tracks[0].durationSeconds ?? 0);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to search.');
    } finally {
      setLoadingSearch(false);
    }
  }

  // ─── Search Suggestions ───────────────────────────────────
  function fetchSuggestions(q: string) {
    if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);

    if (q.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    suggestionsTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-suggestions?q=${encodeURIComponent(q.trim())}&music=true`);
        const data = await res.json();
        if (data.suggestions && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions.slice(0, 8));
          setShowSuggestions(true);
        }
      } catch {
        // silently fail
      }
    }, 300);
  }

  function handleSuggestionClick(suggestion: string) {
    setQuery(suggestion);
    setShowSuggestions(false);
    void runSearch(suggestion);
  }

  // ─── Track playback ───────────────────────────────────────
  const skipTrack = useCallback((direction: -1 | 1, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!selectedTrack || !results.length) return;

    const currentIndex = results.findIndex((t) => t.id === selectedTrack.id);
    let nextIndex: number;

    if (shuffle) {
      do {
        nextIndex = Math.floor(Math.random() * results.length);
      } while (nextIndex === currentIndex && results.length > 1);
    } else {
      nextIndex = currentIndex + direction;
      if (nextIndex < 0) nextIndex = results.length - 1;
      if (nextIndex >= results.length) nextIndex = 0;
    }

    const nextTrack = results[nextIndex];
    if (nextTrack) void startTrack(nextTrack, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrack, results, shuffle]);

  async function startTrack(track: Track, autoplay = true) {
    const requestId = ++requestIdRef.current;
    setSelectedTrack(track);
    setCurrentTime(0);
    setDuration(track.durationSeconds);
    setLoadingStream(true);
    setError(null);

    try {
      const stream = await fetchStream(track);
      if (requestId !== requestIdRef.current) return;
      const fallbackAudioUrl = stream.isFallback
        ? null
        : `/api/audio?id=${encodeURIComponent(track.id)}`;

      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = '';
        currentAudioRef.current.load();
      }

      const audio = new window.Audio(stream.audioUrl);
      audio.preload = 'auto';
      let triedFallbackSource = false;
      audio.volume = muted ? 0 : volume;

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        if (repeatMode === 'one') {
          audio.currentTime = 0;
          void audio.play();
        } else {
          skipTrack(1);
        }
      });

      audio.addEventListener('play', () => setIsPlaying(true));
      audio.addEventListener('pause', () => setIsPlaying(false));
      audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));

      audio.addEventListener('loadedmetadata', () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
        }
      });

      audio.addEventListener('durationchange', () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
        }
      });

      audio.addEventListener('error', () => {
        if (fallbackAudioUrl && !triedFallbackSource) {
          triedFallbackSource = true;
          audio.src = fallbackAudioUrl;
          audio.load();
          if (autoplay) {
            void audio.play().catch(() => {
              setError('Unable to load track.');
              setIsPlaying(false);
            });
          }
          return;
        }

        const mediaError = audio.error;
        const reason = mediaError ? `Media error code ${mediaError.code}` : 'Unable to load track.';
        setError(reason);
        setIsPlaying(false);
      });

      currentAudioRef.current = audio;

      if (autoplay) {
        await audio.play();
      }
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message || 'Unable to load track.');
      setIsPlaying(false);
    } finally {
      if (requestId === requestIdRef.current) setLoadingStream(false);
    }
  }

  async function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowSuggestions(false);
    await runSearch(query);
    (document.activeElement as HTMLElement)?.blur();
  }

  async function togglePlayback(e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!currentAudioRef.current && !selectedTrack) return;

    if (currentAudioRef.current) {
      if (!isPlaying) {
        await playAudioElement();
      } else {
        currentAudioRef.current.pause();
        setIsPlaying(false);
      }
    } else if (selectedTrack) {
      await startTrack(selectedTrack, true);
    }
  }

  function handleSeek(nextValue: number) {
    if (!currentAudioRef.current) return;
    currentAudioRef.current.currentTime = nextValue;
    setCurrentTime(nextValue);
  }

  // ─── Volume ────────────────────────────────────────────────
  function handleVolumeChange(val: number) {
    setVolume(val);
    setMuted(val === 0);
    if (currentAudioRef.current) {
      currentAudioRef.current.volume = val;
    }
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    if (currentAudioRef.current) {
      currentAudioRef.current.volume = next ? 0 : volume;
    }
  }

  // ─── Repeat cycle ─────────────────────────────────────────
  function cycleRepeat() {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }

  // ─── Keyboard shortcuts ───────────────────────────────────
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          void togglePlayback();
          break;
        case 'ArrowRight':
          if (e.shiftKey) {
            skipTrack(1);
          } else if (currentAudioRef.current) {
            handleSeek(Math.min(currentAudioRef.current.currentTime + 5, duration));
          }
          break;
        case 'ArrowLeft':
          if (e.shiftKey) {
            skipTrack(-1);
          } else if (currentAudioRef.current) {
            handleSeek(Math.max(currentAudioRef.current.currentTime - 5, 0));
          }
          break;
        case 'KeyM':
          toggleMute();
          break;
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, selectedTrack, duration, skipTrack]);

  // ─── Initial search on mount ──────────────────────────────
  useEffect(() => {
    void runSearch(STARTER_QUERY);

    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = '';
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Sync volume when changed ─────────────────────────────
  useEffect(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const ambientColor = selectedTrack ? 'var(--accent-glow)' : 'transparent';

  const VolumeActiveIcon = muted || volume === 0
    ? VolumeMuteIcon
    : volume < 0.5
      ? VolumeLowIcon
      : VolumeHighIcon;

  // ─── Equalizer bars component ─────────────────────────────
  const EqBars = ({ paused }: { paused: boolean }) => (
    <div className={styles.eqIndicator}>
      <div className={`${styles.eqBar} ${paused ? styles.eqBarPaused : ''}`} />
      <div className={`${styles.eqBar} ${paused ? styles.eqBarPaused : ''}`} />
      <div className={`${styles.eqBar} ${paused ? styles.eqBarPaused : ''}`} />
    </div>
  );

  // ─── Shimmer placeholders ─────────────────────────────────
  const ShimmerCards = () => (
    <>
      {[1,2,3,4].map(i => (
        <div key={i} className={styles.shimmerCard}>
          <div className={`${styles.shimmerBlock} ${styles.shimmerArt}`} />
          <div className={`${styles.shimmerBlock} ${styles.shimmerText}`} style={{ width: '90%' }} />
          <div className={`${styles.shimmerBlock} ${styles.shimmerText} ${styles.shimmerTextShort}`} />
        </div>
      ))}
    </>
  );

  const ShimmerRows = () => (
    <>
      {[1,2,3].map(i => (
        <div key={i} className={styles.shimmerRow}>
          <div className={`${styles.shimmerBlock} ${styles.shimmerThumb}`} />
          <div style={{ flex: 1 }}>
            <div className={`${styles.shimmerBlock} ${styles.shimmerText}`} style={{ width: '60%' }} />
            <div className={`${styles.shimmerBlock} ${styles.shimmerText} ${styles.shimmerTextShort}`} />
          </div>
        </div>
      ))}
    </>
  );

  // ─── Track row renderer ───────────────────────────────────
  function renderTrackRow(track: Track, keyPrefix: string) {
    const isActive = selectedTrack?.id === track.id;
    return (
      <button
        key={`${keyPrefix}-${track.id}`}
        className={`${styles.trackRow} ${isActive ? styles.trackRowActive : ''}`}
        onClick={() => void startTrack(track, true)}
      >
        {isActive && <EqBars paused={!isPlaying} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.trackThumb} src={track.thumbnail} alt={track.title} referrerPolicy="no-referrer" />
        <div className={styles.trackInfo}>
          <span className={styles.trackTitle}>{track.title}</span>
          <span className={styles.trackArtist}>{track.artist}</span>
        </div>
        <span className={styles.trackDuration}>{track.duration}</span>
      </button>
    );
  }

  // ─── Search bar component ─────────────────────────────────
  function renderSearchBar(extraClass?: string) {
    return (
      <div className={styles.searchWrapper}>
        <form className={`${styles.searchBar} ${extraClass || ''}`} onSubmit={handleSearchSubmit}>
          <span className={styles.searchIcon}><SearchIconSVG /></span>
          <input
            className={styles.searchInput}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              fetchSuggestions(e.target.value);
            }}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search songs, artists..."
          />
        </form>
        {showSuggestions && suggestions.length > 0 && (
          <div className={styles.suggestionsDropdown}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                className={styles.suggestionItem}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSuggestionClick(s)}
              >
                <span className={styles.suggestionIcon}><SearchIconSVG /></span>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className={styles.appContainer}>
      <div className={styles.ambientBackground} style={{ background: `radial-gradient(circle at 50% 0%, ${ambientColor} 0%, transparent 70%)` }} />

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className={styles.desktopSidebar}>
        <div className={styles.logo}>
          <PlayIcon /> <span>PulseTube</span>
        </div>
        <nav className={styles.sidebarNav}>
          <button className={`${styles.sidebarNavItem} ${styles.sidebarNavItemActive}`}>
            <span className={styles.sidebarIcon}><HomeIcon /></span> Home
          </button>
          <button className={styles.sidebarNavItem}>
            <span className={styles.sidebarIcon}><CompassIcon /></span> Discover
          </button>
          <button className={styles.sidebarNavItem}>
            <span className={styles.sidebarIcon}><LibraryIcon /></span> Library
          </button>
        </nav>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className={styles.mainScrollArea}>

        {/* Mobile Header */}
        <header className={styles.header}>
          <h1 className={styles.greeting}>{greeting}</h1>
          {renderSearchBar()}
        </header>

        {/* Desktop Header */}
        <header className={styles.desktopHeader}>
          <h1 className={styles.greeting}>{greeting}</h1>
          {renderSearchBar(styles.desktopSearch)}
        </header>

        {/* Loading shimmer */}
        {results.length === 0 && loadingSearch && (
          <>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Made For You</h2>
              </div>
              <div className={styles.horizontalScroll}>
                <ShimmerCards />
              </div>
            </section>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Trending Tracks</h2>
              </div>
              <ShimmerRows />
            </section>
          </>
        )}

        {/* Made For You */}
        {madeForYou.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Made For You</h2>
            </div>
            <div className={styles.horizontalScroll}>
              {madeForYou.map((track) => (
                <button key={`m-${track.id}`} className={styles.squareCard} onClick={() => void startTrack(track, true)}>
                  <div className={styles.artworkWrapper}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className={styles.artwork} src={track.thumbnail} alt={track.title} referrerPolicy="no-referrer" />
                    <div className={styles.playOverlay}>
                      <div className={styles.playIcon}><PlayIcon /></div>
                    </div>
                    {loadingStream && selectedTrack?.id === track.id && (
                      <div className={styles.loadingOverlay}><div className={styles.spinner} /></div>
                    )}
                  </div>
                  <div>
                    <p className={styles.cardTitle}>{track.title}</p>
                    <p className={styles.cardSubtitle}>{track.artist}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Trending Tracks */}
        {trendingNow.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Trending Tracks</h2>
            </div>
            <div className={styles.trackList}>
              {trendingNow.map((track) => renderTrackRow(track, 't'))}
            </div>
          </section>
        )}

        {/* All Tracks */}
        {allTracks.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>More Results</h2>
            </div>
            <div className={styles.trackList}>
              {allTracks.map((track) => renderTrackRow(track, 'a'))}
            </div>
          </section>
        )}
      </main>

      {/* ── DESKTOP PLAYER BAR ── */}
      <div className={styles.desktopPlayerBar}>
        <div className={styles.playerLeft}>
          {selectedTrack && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.playerArt} src={selectedTrack.thumbnail} alt={selectedTrack.title} referrerPolicy="no-referrer" />
              <div className={styles.trackInfo}>
                <span className={styles.trackTitle}>{selectedTrack.title}</span>
                <span className={styles.trackArtist}>{selectedTrack.artist}</span>
              </div>
            </>
          )}
        </div>

        <div className={styles.playerCenter}>
          <div className={styles.playerControls}>
            <button
              className={`${styles.controlBtn} ${shuffle ? styles.controlBtnActive : ''}`}
              onClick={() => setShuffle(p => !p)}
              title="Shuffle"
            >
              <ShuffleIcon />
            </button>
            <button className={styles.controlBtn} onClick={(e) => skipTrack(-1, e)} title="Previous"><SkipBackIcon /></button>
            <button className={styles.playPauseBtn} onClick={(e) => void togglePlayback(e)} title={isPlaying ? 'Pause' : 'Play'}>
              {loadingStream ? <div className={styles.spinner} style={{ width: 20, height: 20, borderWidth: 2 }} /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button className={styles.controlBtn} onClick={(e) => skipTrack(1, e)} title="Next"><SkipForwardIcon /></button>
            <button
              className={`${styles.controlBtn} ${repeatMode !== 'off' ? styles.controlBtnActive : ''}`}
              onClick={cycleRepeat}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <RepeatOneIcon /> : <RepeatIcon />}
            </button>
          </div>
          <div className={styles.timelineWrap}>
            <span>{formatClock(currentTime)}</span>
            <input
              type="range"
              className={styles.timeline}
              min={0}
              max={duration || selectedTrack?.durationSeconds || 1}
              step={0.1}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              disabled={!selectedTrack}
              style={{ background: `linear-gradient(to right, var(--text-primary) ${progressPercent}%, var(--bg-surface-hover) ${progressPercent}%)` }}
            />
            <span>{formatClock(duration || selectedTrack?.durationSeconds || 0)}</span>
          </div>
        </div>

        <div className={styles.playerRight}>
          <button
            className={`${styles.controlBtn} ${queueOpen ? styles.controlBtnActive : ''}`}
            onClick={() => setQueueOpen(p => !p)}
            title="Queue"
          >
            <QueueIcon />
          </button>
          <div className={styles.volumeWrap}>
            <button className={styles.volumeBtn} onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
              <VolumeActiveIcon />
            </button>
            <input
              type="range"
              className={styles.volumeSlider}
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              style={{ background: `linear-gradient(to right, var(--text-primary) ${(muted ? 0 : volume) * 100}%, var(--bg-surface-hover) ${(muted ? 0 : volume) * 100}%)` }}
            />
          </div>
        </div>
      </div>

      {/* ── QUEUE PANEL ── */}
      {queueOpen && (
        <>
          <div className={styles.queueOverlay} onClick={() => setQueueOpen(false)} />
          <div className={styles.queuePanel}>
            <div className={styles.queueHandle}>
              <div className={styles.queueHandleBar} />
            </div>
            <h3 className={styles.queueTitle}>Up Next</h3>
            <div className={styles.trackList}>
              {results.map((track) => renderTrackRow(track, 'q'))}
            </div>
          </div>
        </>
      )}

      {/* ── MOBILE PLAYER DOCK ── */}
      {selectedTrack && (
        <div className={styles.mobilePlayerDock} onClick={() => setFsOpen(true)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.dockArt} src={selectedTrack.thumbnail} alt={selectedTrack.title} referrerPolicy="no-referrer" />
          <div className={styles.dockInfo}>
            <span className={styles.dockTitle}>{selectedTrack.title}</span>
            <span className={styles.dockArtist}>{selectedTrack.artist}</span>
          </div>
          <div className={styles.dockControls}>
            <button className={styles.dockBtn} onClick={(e) => void togglePlayback(e)}>
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button className={styles.dockBtn} onClick={(e) => skipTrack(1, e)}>
              <SkipForwardIcon />
            </button>
          </div>
          <div className={styles.dockProgress} style={{ width: `${progressPercent}%` }} />
        </div>
      )}

      {/* ── MOBILE FULLSCREEN PLAYER ── */}
      <div className={`${styles.fullscreenPlayer} ${fsOpen ? styles.visible : ''}`}>
        <div className={styles.fsHeader}>
          <button className={styles.collapseBtn} onClick={() => setFsOpen(false)}>
            <ChevronDownIcon />
          </button>
          <span className={styles.fsLabel}>Now Playing</span>
          <div style={{ width: 24 }} />
        </div>

        <div className={styles.fsArtWrapper}>
          {selectedTrack && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.fsArt} src={selectedTrack.thumbnail} alt={selectedTrack.title} referrerPolicy="no-referrer" />
          )}
          {loadingStream && (
            <div className={styles.loadingOverlay}><div className={styles.spinner} /></div>
          )}
        </div>

        <div className={styles.fsInfo}>
          <h2 className={styles.fsTitle}>{selectedTrack?.title || 'No track'}</h2>
          <p className={styles.fsArtist}>{selectedTrack?.artist}</p>
        </div>

        <div className={styles.fsTimelineWrap}>
          <input
            type="range"
            className={styles.timeline}
            min={0}
            max={duration || selectedTrack?.durationSeconds || 1}
            step={0.1}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            disabled={!selectedTrack}
            style={{
              width: '100%',
              background: `linear-gradient(to right, var(--text-primary) ${progressPercent}%, var(--bg-surface-hover) ${progressPercent}%)`
            }}
          />
          <div className={styles.fsTimeLabels}>
            <span>{formatClock(currentTime)}</span>
            <span>{formatClock(duration || selectedTrack?.durationSeconds || 0)}</span>
          </div>
        </div>

        <div className={styles.fsControls}>
          <button
            className={`${styles.fsSecondaryBtn} ${shuffle ? styles.fsSecondaryBtnActive : ''}`}
            onClick={() => setShuffle(p => !p)}
            title="Shuffle"
          >
            <ShuffleIcon />
          </button>
          <button className={styles.fsOtherBtn} onClick={(e) => skipTrack(-1, e)}><SkipBackIcon /></button>
          <button className={styles.fsPlayBtn} onClick={(e) => void togglePlayback(e)}>
            {loadingStream ? <div className={styles.spinner} style={{ width: 28, height: 28, borderColor: 'rgba(0,0,0,0.2)', borderTopColor: 'var(--bg-base)' }} /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button className={styles.fsOtherBtn} onClick={(e) => skipTrack(1, e)}><SkipForwardIcon /></button>
          <button
            className={`${styles.fsSecondaryBtn} ${repeatMode !== 'off' ? styles.fsSecondaryBtnActive : ''}`}
            onClick={cycleRepeat}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? <RepeatOneIcon /> : <RepeatIcon />}
          </button>
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className={styles.bottomNav}>
        <button className={`${styles.navItem} ${styles.navItemActive}`}>
          <span className={styles.navIcon}><HomeIcon /></span>
          <span className={styles.navLabel}>Home</span>
        </button>
        <button className={styles.navItem} onClick={() => {
          const input = document.querySelector('input[type="text"]') as HTMLInputElement;
          input?.focus();
        }}>
          <span className={styles.navIcon}><CompassIcon /></span>
          <span className={styles.navLabel}>Search</span>
        </button>
        <button className={styles.navItem} onClick={() => setQueueOpen(true)}>
          <span className={styles.navIcon}><LibraryIcon /></span>
          <span className={styles.navLabel}>Queue</span>
        </button>
      </nav>

      {/* ── ERROR TOAST ── */}
      {error && (
        <div className={styles.toast}>
          <span className={styles.toastMessage}>{error}</span>
          {selectedTrack && (
            <button className={styles.toastBtn} onClick={() => { setError(null); void startTrack(selectedTrack, true); }}>
              Retry
            </button>
          )}
          <button className={styles.toastClose} onClick={() => setError(null)}>
            <CloseIcon />
          </button>
        </div>
      )}
    </div>
  );
}
