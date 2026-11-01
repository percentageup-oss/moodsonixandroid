import React, { useState } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { cn } from '../../lib/utils';
import { Check, Settings, Info } from 'lucide-react';

interface QualityMenuProps {
  className?: string;
  onClose?: () => void;
}

const QUALITY_OPTIONS = [
  { id: 'auto', label: 'Auto (Recommended)', hint: 'Adaptive to network speed', estData: 'Dynamic' },
  { id: 'tiny', label: 'Data Saver (144p)', hint: 'Lowest data usage (~30MB/hr)', estData: 'Lowest' },
  { id: 'small', label: 'Low (240p)', hint: 'Light stream (~50MB/hr)', estData: 'Low' },
  { id: 'medium', label: 'Normal (360p)', hint: 'Standard quality (~100MB/hr)', estData: 'Medium' },
  { id: 'large', label: 'High (480p)', hint: 'Clear audio & video (~180MB/hr)', estData: 'High' },
  { id: 'hd720', label: 'HD (720p)', hint: 'Higher data (~350MB/hr)', estData: 'Very High' },
  { id: 'hd1080', label: 'Full HD (1080p)', hint: 'Highest data (~600MB/hr)', estData: 'Maximum' }
];

export const QualityMenu: React.FC<QualityMenuProps> = ({ className, onClose }) => {
  const { quality, setQuality } = usePlayer();
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  return (
    <div className={cn('w-72 p-3 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-color)] shadow-2xl backdrop-blur-xl', className)}>
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-mono uppercase tracking-wider font-semibold text-[var(--text-primary)]">
            // STREAM QUALITY
          </span>
        </div>
        <button
          onClick={() => setShowDisclaimer(!showDisclaimer)}
          title="Streaming note"
          className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors p-1"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>

      {showDisclaimer && (
        <div className="p-2 mb-2.5 rounded-lg bg-[var(--surface)] text-[11px] text-[var(--text-secondary)] leading-relaxed border border-[var(--border-color)]">
          Quality is requested via the official YouTube IFrame Player. Actual delivery depends on YouTube stream availability, device, and network throughput.
        </div>
      )}

      <div className="space-y-1">
        {QUALITY_OPTIONS.map((opt) => {
          const isSelected = quality === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => {
                setQuality(opt.id);
                if (onClose) onClose();
              }}
              className={cn(
                'w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors text-xs',
                isSelected
                  ? 'bg-[var(--surface-secondary)] text-[var(--accent)] font-medium'
                  : 'text-[var(--text-primary)] hover:bg-[var(--surface)]'
              )}
            >
              <div>
                <p className="font-medium">{opt.label}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{opt.hint}</p>
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-[var(--accent)] ml-2" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
