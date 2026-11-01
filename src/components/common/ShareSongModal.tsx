import React, { useState } from 'react';
import { Song } from '../../types/music';
import { X, Copy, Check, Share2, Link } from 'lucide-react';

interface ShareSongModalProps {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareSongModal: React.FC<ShareSongModalProps> = ({ song, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !song) return null;

  const shareUrl = `${window.location.origin}/?song=${song.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${song.title} - ${song.artist} on Moodsonix`,
          text: `Listen to "${song.title}" by ${song.artist} on Moodsonix:`,
          url: shareUrl
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm rounded-3xl bg-[var(--surface-elevated)] border border-[var(--border-color)] shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-sm font-mono uppercase tracking-wider font-semibold text-[var(--text-primary)]">
              // SHARE SONG
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[var(--text-muted)] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Song info */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] mb-4">
          <img
            src={song.thumbnail}
            alt={song.title}
            className="w-12 h-12 rounded-xl object-cover shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold truncate text-[var(--text-primary)]">{song.title}</h4>
            <p className="text-xs text-[var(--text-secondary)] truncate">{song.artist}</p>
          </div>
        </div>

        {/* Link Input */}
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] mb-4">
          <Link className="w-4 h-4 text-[var(--text-muted)] ml-2 shrink-0" />
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 bg-transparent text-xs text-[var(--text-secondary)] truncate focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-black text-xs font-semibold hover:bg-[var(--accent-hover)] transition-colors flex items-center gap-1.5 shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Native Web Share button if supported */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={handleNativeShare}
            className="w-full py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Share2 className="w-4 h-4 text-[var(--accent)]" />
            <span>Share via apps...</span>
          </button>
        )}
      </div>
    </div>
  );
};
