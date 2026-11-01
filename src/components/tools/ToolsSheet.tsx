import React, { useState } from 'react';
import { useFocusTimer } from '../../hooks/useFocusTimer';
import { useTheme } from '../../context/ThemeContext';
import { ambientAudio } from '../../services/ambientAudio';
import { formatTime, cn } from '../../lib/utils';
import { AppTheme } from '../../types/music';
import {
  X,
  Clock,
  CloudRain,
  Flame,
  Trees,
  Palette,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Bell,
  Sparkles,
  Check
} from 'lucide-react';

interface ToolsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ToolsSheet: React.FC<ToolsSheetProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'focus' | 'ambient' | 'theme'>('focus');
  const { theme, setTheme } = useTheme();

  // Pomodoro Focus Timer Hook
  const {
    mode,
    isActive,
    timeLeft,
    totalDuration,
    progress,
    soundEnabled,
    setSoundEnabled,
    start,
    pause,
    resume,
    reset,
    switchMode,
    requestNotificationPermission
  } = useFocusTimer();

  // Ambient Mixer state
  const [rainEnabled, setRainEnabled] = useState(false);
  const [rainVolume, setRainVolume] = useState(0.5);

  const [campfireEnabled, setCampfireEnabled] = useState(false);
  const [campfireVolume, setCampfireVolume] = useState(0.5);

  const [natureEnabled, setNatureEnabled] = useState(false);
  const [natureVolume, setNatureVolume] = useState(0.5);

  if (!isOpen) return null;

  // Toggle ambient sounds
  const handleToggleRain = () => {
    const next = !rainEnabled;
    setRainEnabled(next);
    ambientAudio.setRain(next, rainVolume);
  };

  const handleRainVolumeChange = (vol: number) => {
    setRainVolume(vol);
    if (rainEnabled) ambientAudio.setRain(true, vol);
  };

  const handleToggleCampfire = () => {
    const next = !campfireEnabled;
    setCampfireEnabled(next);
    ambientAudio.setCampfire(next, campfireVolume);
  };

  const handleCampfireVolumeChange = (vol: number) => {
    setCampfireVolume(vol);
    if (campfireEnabled) ambientAudio.setCampfire(true, vol);
  };

  const handleToggleNature = () => {
    const next = !natureEnabled;
    setNatureEnabled(next);
    ambientAudio.setNature(next, natureVolume);
  };

  const handleNatureVolumeChange = (vol: number) => {
    setNatureVolume(vol);
    if (natureEnabled) ambientAudio.setNature(true, vol);
  };

  // Circular progress calculations for Pomodoro
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  const themesList: { id: AppTheme; name: string; bg: string; accent: string; desc: string }[] = [
    {
      id: 'theme-midnight',
      name: 'Midnight Dark',
      bg: '#0A0A0F',
      accent: '#C8F542',
      desc: 'Default dark mode with vibrant acoustic lime accent'
    },
    {
      id: 'theme-neon',
      name: 'Neon Cyberpunk',
      bg: '#08070D',
      accent: '#00FF88',
      desc: 'Deep futuristic obsidian with glowing green and purple'
    },
    {
      id: 'theme-slate',
      name: 'Minimalist Slate',
      bg: '#F8FAFC',
      accent: '#10B981',
      desc: 'Clean, serene light workspace with slate surfaces'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[var(--surface-elevated)] border border-[var(--border-color)] shadow-2xl p-6 flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-sm font-mono uppercase tracking-wider font-semibold text-[var(--text-primary)]">
              // PRODUCTIVITY TOOLS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] mb-6 shrink-0">
          <button
            onClick={() => setActiveTab('focus')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all',
              activeTab === 'focus'
                ? 'bg-[var(--surface-secondary)] text-[var(--accent)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Focus</span>
          </button>
          <button
            onClick={() => setActiveTab('ambient')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all',
              activeTab === 'ambient'
                ? 'bg-[var(--surface-secondary)] text-[var(--accent)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>Ambient</span>
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all',
              activeTab === 'theme'
                ? 'bg-[var(--surface-secondary)] text-[var(--accent)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Theme</span>
          </button>
        </div>

        {/* Tab 1: FOCUS (POMODORO) */}
        {activeTab === 'focus' && (
          <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto py-2">
            {/* Mode Switcher */}
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => switchMode('focus')}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all',
                  mode === 'focus'
                    ? 'bg-[var(--accent)] text-black'
                    : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                )}
              >
                Focus (25m)
              </button>
              <button
                onClick={() => switchMode('break')}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all',
                  mode === 'break'
                    ? 'bg-[var(--accent)] text-black'
                    : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                )}
              >
                Break (5m)
              </button>
            </div>

            {/* Circular Progress Ring */}
            <div className="relative w-44 h-44 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="88"
                  cy="88"
                  r={radius}
                  stroke="var(--surface-secondary)"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="88"
                  cy="88"
                  r={radius}
                  stroke="var(--accent)"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-mono font-bold text-[var(--text-primary)] tracking-tight">
                  {formatTime(timeLeft)}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mt-1">
                  {mode === 'focus' ? '// DEEP WORK' : '// REST BREAK'}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={reset}
                className="p-3 rounded-full bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                title="Reset timer"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={isActive ? pause : (timeLeft < totalDuration ? resume : start)}
                className="w-14 h-14 rounded-full bg-[var(--accent)] text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all glow-accent"
                title={isActive ? 'Pause' : 'Start'}
              >
                {isActive ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                )}
              </button>
            </div>

            {/* Sound and Notification Toggles */}
            <div className="flex items-center justify-between w-full pt-4 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="flex items-center gap-2 hover:text-[var(--text-primary)] transition-colors"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-[var(--accent)]" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
                <span>End chime {soundEnabled ? 'on' : 'off'}</span>
              </button>
              <button
                onClick={requestNotificationPermission}
                className="flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Enable notifications</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: AMBIENT MIXER (WEB AUDIO API) */}
        {activeTab === 'ambient' && (
          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            <p className="text-xs text-[var(--text-muted)] font-mono leading-relaxed mb-4">
              // Ambient audio is synthesized locally via Web Audio API and plays layered over your music.
            </p>

            {/* Rain */}
            <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className={cn('p-2 rounded-xl transition-colors', rainEnabled ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]')}>
                    <CloudRain className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Rainfall</h3>
                    <p className="text-[10px] text-[var(--text-muted)]">Filtered pink noise shower</p>
                  </div>
                </div>
                <button
                  onClick={handleToggleRain}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold transition-colors',
                    rainEnabled
                      ? 'bg-[var(--accent)] text-black'
                      : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-white'
                  )}
                >
                  {rainEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={rainVolume}
                onChange={(e) => handleRainVolumeChange(parseFloat(e.target.value))}
                disabled={!rainEnabled}
                className="w-full h-1 bg-[var(--surface-secondary)] rounded appearance-none cursor-pointer accent-[var(--accent)] disabled:opacity-30"
              />
            </div>

            {/* Campfire */}
            <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className={cn('p-2 rounded-xl transition-colors', campfireEnabled ? 'bg-amber-500/15 text-amber-400' : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]')}>
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Campfire</h3>
                    <p className="text-[10px] text-[var(--text-muted)]">Warm ember crackles & transients</p>
                  </div>
                </div>
                <button
                  onClick={handleToggleCampfire}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold transition-colors',
                    campfireEnabled
                      ? 'bg-[var(--accent)] text-black'
                      : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-white'
                  )}
                >
                  {campfireEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={campfireVolume}
                onChange={(e) => handleCampfireVolumeChange(parseFloat(e.target.value))}
                disabled={!campfireEnabled}
                className="w-full h-1 bg-[var(--surface-secondary)] rounded appearance-none cursor-pointer accent-[var(--accent)] disabled:opacity-30"
              />
            </div>

            {/* Nature */}
            <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className={cn('p-2 rounded-xl transition-colors', natureEnabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]')}>
                    <Trees className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Nature</h3>
                    <p className="text-[10px] text-[var(--text-muted)]">Gentle breeze & harmonic chirps</p>
                  </div>
                </div>
                <button
                  onClick={handleToggleNature}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold transition-colors',
                    natureEnabled
                      ? 'bg-[var(--accent)] text-black'
                      : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-white'
                  )}
                >
                  {natureEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={natureVolume}
                onChange={(e) => handleNatureVolumeChange(parseFloat(e.target.value))}
                disabled={!natureEnabled}
                className="w-full h-1 bg-[var(--surface-secondary)] rounded appearance-none cursor-pointer accent-[var(--accent)] disabled:opacity-30"
              />
            </div>
          </div>
        )}

        {/* Tab 3: THEME SELECTOR */}
        {activeTab === 'theme' && (
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            <p className="text-xs text-[var(--text-muted)] font-mono leading-relaxed mb-3">
              // Custom themes apply instantly and are saved in local storage.
            </p>

            {themesList.map((t) => {
              const isSelected = theme === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    'p-3.5 rounded-2xl cursor-pointer border transition-all flex items-center justify-between',
                    isSelected
                      ? 'bg-[var(--surface)] border-[var(--accent)] shadow-md'
                      : 'bg-[var(--surface)] border-[var(--border-color)] hover:border-white/20'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center shrink-0"
                      style={{ backgroundColor: t.bg }}
                    >
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: t.accent }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{t.name}</h3>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{t.desc}</p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[var(--accent)] shrink-0 ml-2" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
