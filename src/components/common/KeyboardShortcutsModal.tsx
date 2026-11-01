import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause playback' },
  { key: '←', desc: 'Seek backward 10s' },
  { key: '→', desc: 'Seek forward 10s' },
  { key: 'N', desc: 'Next track in queue' },
  { key: 'P', desc: 'Previous track' },
  { key: 'M', desc: 'Mute / Unmute' },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm rounded-3xl bg-[var(--surface-elevated)] border border-[var(--border-color)] shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-sm font-mono uppercase tracking-wider font-semibold text-[var(--text-primary)]">
              // KEYBOARD SHORTCUTS
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[var(--text-muted)] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {SHORTCUTS.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between p-2 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-xs"
            >
              <span className="text-[var(--text-secondary)]">{s.desc}</span>
              <kbd className="px-2 py-1 rounded-md bg-[var(--surface-secondary)] border border-[var(--border-color)] font-mono text-[var(--accent)] text-[11px] font-semibold">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-[var(--text-muted)] font-mono text-center">
          Shortcuts are automatically bypassed while typing in search or text fields.
        </p>
      </div>
    </div>
  );
};
