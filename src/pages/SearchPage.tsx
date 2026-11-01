import React, { useState, useEffect, useRef } from 'react';
import { Song } from '../types/music';
import { searchMusic } from '../services/musicApi';
import { useUser } from '../context/UserContext';
import { SongRow } from '../components/music/SongRow';
import { SongCard } from '../components/music/SongCard';
import {
  Search,
  Sparkles,
  Loader2,
  AlertCircle,
  LayoutGrid,
  List,
  Music2,
  RefreshCw,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SearchPageProps {
  initialQuery?: string;
  onShareSong: (song: Song) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({ initialQuery = '', onShareSong }) => {
  const { incrementSearchCount, isLimitReached, setShowAuthModal } = useUser();

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isMoodMode, setIsMoodMode] = useState(false);
  const [generatedMoodQuery, setGeneratedMoodQuery] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const executeSearch = async (searchQuery: string, useMood = isMoodMode) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Check guest search limit
    const allowed = incrementSearchCount();
    if (!allowed) {
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    setGeneratedMoodQuery(null);

    try {
      const { results: searchResults, generatedQuery } = await searchMusic(
        trimmed,
        useMood,
        abortControllerRef.current.signal
      );
      setGeneratedMoodQuery(generatedQuery || null);
      setResults(searchResults || []);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to search YouTube Music');
        setResults([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Run initial query if provided from home page
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      executeSearch(initialQuery, false);
    }
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setError(null);
    setGeneratedMoodQuery(null);
  };

  const quickPills = [
    'Lofi study beats',
    'Synthwave night drive',
    'Workout phonk',
    'Peaceful acoustic morning',
    'Japanese city pop',
    'Hans Zimmer orchestral'
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header and Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-semibold">
              // SEARCH ENGINE
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mt-0.5">
              Explore YouTube Music
            </h1>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-color)]">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'list'
                  ? 'bg-[var(--surface-elevated)] text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-white'
              )}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'grid'
                  ? 'bg-[var(--surface-elevated)] text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-white'
              )}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Input Bar with Mood Switch */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-4 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isMoodMode
                  ? 'Describe a mood or vibe (e.g. "rainy afternoon reading in a cafe")...'
                  : 'Search tracks, artists, albums, or lyrics...'
              }
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-all shadow-inner"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 p-1 rounded-full text-[var(--text-muted)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Mood AI Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !isMoodMode;
                setIsMoodMode(next);
                if (query.trim()) executeSearch(query, next);
              }}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-3 rounded-2xl text-xs font-semibold border transition-all shrink-0',
                isMoodMode
                  ? 'bg-[var(--accent)] text-black border-[var(--accent)] shadow-md glow-accent-sm'
                  : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-white'
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mood AI</span>
            </button>

            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-6 py-3 rounded-2xl bg-[var(--accent)] text-black font-semibold text-xs hover:bg-[var(--accent-hover)] transition-all shadow-md disabled:opacity-50 flex items-center gap-2 shrink-0"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Search</span>
            </button>
          </div>
        </form>

        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase shrink-0">
            // QUICK PICKS:
          </span>
          {quickPills.map((pill) => (
            <button
              key={pill}
              onClick={() => {
                setQuery(pill);
                executeSearch(pill, false);
              }}
              className="px-3 py-1 rounded-full bg-[var(--surface-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-colors shrink-0"
            >
              {pill}
            </button>
          ))}
        </div>
      </div>

      {/* Generated Mood AI Feedback */}
      {generatedMoodQuery && (
        <div className="p-3.5 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-between text-xs text-[var(--text-primary)]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span>
              Mood analyzed: <strong className="text-[var(--accent)]">"{generatedMoodQuery}"</strong>
            </span>
          </div>
        </div>
      )}

      {/* Guest Limit Prompt if triggered */}
      {isLimitReached && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <div>
            <p className="font-semibold">Guest search limit reached</p>
            <p className="text-[11px] opacity-80 mt-0.5">Sign in to enjoy unlimited searches and cloud playlist sync.</p>
          </div>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-400 text-black font-semibold text-xs hover:bg-amber-300 transition-colors"
          >
            Sign In
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3' : 'space-y-2'}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] animate-pulse',
                viewMode === 'list' && 'flex items-center gap-3'
              )}
            >
              <div className={cn('bg-[var(--surface-secondary)] rounded-xl', viewMode === 'grid' ? 'aspect-square w-full mb-3' : 'w-11 h-11 shrink-0')} />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[var(--surface-secondary)] rounded w-3/4" />
                <div className="h-3 bg-[var(--surface-secondary)] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="p-6 text-center rounded-2xl bg-[var(--surface)] border border-red-500/20 text-red-400 space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <div>
            <h3 className="font-bold text-sm">Search encountered a hiccup</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">{error}</p>
          </div>
          <button
            onClick={() => executeSearch(query)}
            className="px-4 py-2 rounded-xl bg-[var(--surface-secondary)] text-xs text-white hover:bg-[var(--surface-elevated)] transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Search</span>
          </button>
        </div>
      )}

      {/* Results Display */}
      {!isLoading && !error && results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
            <span>// FOUND {results.length} SONGS</span>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {results.map((song) => (
                <SongCard key={song.id} song={song} onShare={onShareSong} />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((song, idx) => (
                <SongRow key={song.id} song={song} index={idx} onShare={onShareSong} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && results.length === 0 && query && (
        <div className="py-16 text-center text-[var(--text-muted)] space-y-3">
          <Music2 className="w-10 h-10 mx-auto opacity-30 stroke-[1.5]" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">No songs found</h3>
          <p className="text-xs max-w-sm mx-auto">
            Try checking spelling, using artist names, or tapping one of the quick suggestions above.
          </p>
        </div>
      )}
    </div>
  );
};
