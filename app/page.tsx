'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import styles from './page.module.css';
import type { SearchResponse, StreamResponse, Track } from '@/lib/types';

const STARTER_QUERY = 'lofi hip hop';

// --- SVG Icons ---
const PlayIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const PauseIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
const SkipForwardIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>;
const SkipBackIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>;
const SearchIconSVG = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const HomeIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const CompassIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>;
const LibraryIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></svg>;
const ChevronDownIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>;

function formatClock(time: number) {
  if (!Number.isFinite(time) || time < 0) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function HomePage() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const streamCacheRef = useRef<Map<string, StreamResponse>>(new Map());
  const requestIdRef = useRef(0);
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingStream, setLoadingStream] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [fsOpen, setFsOpen] = useState(false); // Fullscreen player state

  const madeForYou = useMemo(() => results.slice(0, 6), [results]);
  const trendingNow = useMemo(() => results.slice(6, 12), [results]);

  async function playAudioElement() {
    if (!audioRef.current) return false;
    try {
      await audioRef.current.play();
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

  async function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();
    if (!trimmed) return;

    setLoadingSearch(true);
    setError(null);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Search failed.');
      }

      setResults(data.tracks);
      
      // Auto select first track if none selected ever
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

  async function startTrack(track: Track, autoplay = true) {
    const requestId = ++requestIdRef.current;
    setSelectedTrack(track);
    setCurrentTime(0);
    setDuration(track.durationSeconds);
    setLoadingStream(true);
    setError(null);

    try {
      const stream = await fetchStream(track);
      if (requestId !== requestIdRef.current || !audioRef.current) return;

      audioRef.current.src = stream.audioUrl;
      audioRef.current.load();

      if (autoplay) {
        await playAudioElement();
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
    await runSearch(query);
    // On mobile, blur to hide keyboard
    (document.activeElement as HTMLElement)?.blur(); 
  }

  async function togglePlayback(e?: React.MouseEvent) {
    if (e) e.stopPropagation(); // prevent bubbling if on dock
    if (!audioRef.current || !selectedTrack) return;

    if (audioRef.current.src) {
      if (audioRef.current.paused) {
        await playAudioElement();
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      await startTrack(selectedTrack, true);
    }
  }

  function handleSeek(nextValue: number) {
    if (!audioRef.current?.src) return;
    audioRef.current.currentTime = nextValue;
    setCurrentTime(nextValue);
  }

  function skipTrack(direction: -1 | 1, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!selectedTrack || !results.length) return;

    const currentIndex = results.findIndex((t) => t.id === selectedTrack.id);
    // Loop around
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = results.length - 1;
    if (nextIndex >= results.length) nextIndex = 0;

    const nextTrack = results[nextIndex];
    if (nextTrack) void startTrack(nextTrack, true);
  }

  useEffect(() => {
    void runSearch(STARTER_QUERY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  // Use track artwork for ambient background glow
  const ambientColor = selectedTrack ? 'var(--accent-glow)' : 'transparent'; 

  return (
    <div className={styles.appContainer}>
      <div className={styles.ambientBackground} style={{ background: `radial-gradient(circle at 50% 0%, ${ambientColor} 0%, transparent 70%)` }} />

      {/* --- DESKTOP SIDEBAR --- */}
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

      {/* --- MAIN CONTENT AREA --- */}
      <main className={styles.mainScrollArea}>
        
        {/* Mobile Header */}
        <header className={styles.header}>
          <h1 className={styles.greeting}>Good Evening</h1>
          <form className={styles.searchBar} onSubmit={handleSearchSubmit}>
            <span className={styles.searchIcon}><SearchIconSVG /></span>
            <input
              className={styles.searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Artists, songs, or podcasts"
            />
          </form>
        </header>

        {/* Desktop Header overrides */}
        <header className={styles.desktopHeader}>
          <h1 className={styles.greeting}>Good Evening</h1>
          <form className={`${styles.searchBar} ${styles.desktopSearch}`} onSubmit={handleSearchSubmit}>
            <span className={styles.searchIcon}><SearchIconSVG /></span>
            <input
              className={styles.searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for songs or artists"
            />
          </form>
        </header>

        {results.length === 0 && loadingSearch && (
          <div className={styles.section}><p>Loading vibes...</p></div>
        )}

        {madeForYou.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Made For You</h2>
            </div>
            <div className={styles.horizontalScroll}>
              <div className={styles.desktopTrackGrid}>
                {madeForYou.map((track) => (
                  <button key={`m-${track.id}`} className={styles.squareCard} onClick={() => void startTrack(track, true)}>
                    <div className={styles.artworkWrapper}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className={styles.artwork} src={track.thumbnail} alt={track.title} referrerPolicy="no-referrer" />
                      <div className={styles.playOverlay}>
                        <div className={styles.playIcon}><PlayIcon /></div>
                      </div>
                    </div>
                    <div>
                      <p className={styles.cardTitle}>{track.title}</p>
                      <p className={styles.cardSubtitle}>{track.artist}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {trendingNow.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Trending Tracks</h2>
            </div>
            <div className={styles.trackList}>
              {trendingNow.map((track) => (
                <button
                  key={`t-${track.id}`}
                  className={`${styles.trackRow} ${selectedTrack?.id === track.id ? styles.trackRowActive : ''}`}
                  onClick={() => void startTrack(track, true)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.trackThumb} src={track.thumbnail} alt={track.title} referrerPolicy="no-referrer" />
                  <div className={styles.trackInfo}>
                    <span className={styles.trackTitle}>{track.title}</span>
                    <span className={styles.trackArtist}>{track.artist}</span>
                  </div>
                  <span className={styles.trackDuration}>{track.duration}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* --- DESKTOP PLAYER BAR --- */}
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
            <button className={styles.controlBtn} onClick={(e) => skipTrack(-1, e)}><SkipBackIcon/></button>
            <button className={styles.playPauseBtn} onClick={(e) => void togglePlayback(e)}>
              {isPlaying ? <PauseIcon/> : <PlayIcon/>}
            </button>
            <button className={styles.controlBtn} onClick={(e) => skipTrack(1, e)}><SkipForwardIcon/></button>
          </div>
          <div className={styles.timelineWrap}>
            <span>{formatClock(currentTime)}</span>
            <input
              type="range"
              className={styles.timeline}
              min={0}
              max={duration || selectedTrack?.durationSeconds || 1}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              disabled={!selectedTrack}
              style={{ background: `linear-gradient(to right, var(--text-primary) ${progressPercent}%, var(--bg-surface-hover) ${progressPercent}%)` }}
            />
            <span>{formatClock(duration || selectedTrack?.durationSeconds || 0)}</span>
          </div>
        </div>

        <div className={styles.playerRight}>
          <span className={styles.controlBtn}><LibraryIcon/></span>
        </div>
      </div>

      {/* --- MOBILE PLAYER DOCK --- */}
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
              {isPlaying ? <PauseIcon/> : <PlayIcon/>}
            </button>
            <button className={styles.dockBtn} onClick={(e) => skipTrack(1, e)}>
              <SkipForwardIcon/>
            </button>
          </div>
          {/* Thin progress bar at bottom of dock */}
          <div className={styles.dockProgress} style={{ width: `${progressPercent}%` }} />
        </div>
      )}

      {/* --- MOBILE FULLSCREEN PLAYER --- */}
      <div className={`${styles.fullscreenPlayer} ${fsOpen ? styles.visible : ''}`}>
        <div className={styles.fsHeader}>
          <button className={styles.collapseBtn} onClick={() => setFsOpen(false)}>
            <ChevronDownIcon />
          </button>
          <span className={styles.fsLabel}>Now Playing</span>
          <div style={{ width: 24 }} /> {/* align center workaround */}
        </div>

        <div className={styles.fsArtWrapper}>
          {selectedTrack && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.fsArt} src={selectedTrack.thumbnail} alt={selectedTrack.title} referrerPolicy="no-referrer" />
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
          <button className={styles.fsOtherBtn} onClick={(e) => skipTrack(-1, e)}><SkipBackIcon/></button>
          <button className={styles.fsPlayBtn} onClick={(e) => void togglePlayback(e)}>
            {isPlaying ? <PauseIcon/> : <PlayIcon/>}
          </button>
          <button className={styles.fsOtherBtn} onClick={(e) => skipTrack(1, e)}><SkipForwardIcon/></button>
        </div>
      </div>

      {/* --- MOBILE BOTTOM NAV --- */}
      <nav className={styles.bottomNav}>
        <button className={`${styles.navItem} ${styles.navItemActive}`}>
          <span className={styles.navIcon}><HomeIcon /></span>
          <span className={styles.navLabel}>Home</span>
        </button>
        <button className={styles.navItem}>
          <span className={styles.navIcon}><CompassIcon /></span>
          <span className={styles.navLabel}>Search</span>
        </button>
        <button className={styles.navItem}>
          <span className={styles.navIcon}><LibraryIcon /></span>
          <span className={styles.navLabel}>Library</span>
        </button>
      </nav>

      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : selectedTrack?.durationSeconds ?? 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          setError('Playback error');
        }}
        onEnded={() => {
          setIsPlaying(false);
          skipTrack(1);
        }}
        style={{ display: 'none' }}
      />
    </div>
  );
}
