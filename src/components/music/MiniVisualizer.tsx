import React from 'react';
import { cn } from '../../lib/utils';

interface MiniVisualizerProps {
  isPlaying: boolean;
  className?: string;
  barCount?: number;
}

export const MiniVisualizer: React.FC<MiniVisualizerProps> = ({
  isPlaying,
  className,
  barCount = 4
}) => {
  return (
    <div className={cn('flex items-end gap-[3px] h-4 px-1', className)}>
      {Array.from({ length: barCount }).map((_, idx) => (
        <span
          key={idx}
          className={cn(
            'w-[3px] rounded-full transition-all duration-300',
            isPlaying
              ? 'bg-[var(--accent)]'
              : 'bg-[var(--text-muted)] h-[4px]'
          )}
          style={{
            height: isPlaying ? undefined : '4px',
            animation: isPlaying
              ? `soundwave ${0.9 + (idx % 3) * 0.25}s ease-in-out infinite ${(idx * 0.15).toFixed(2)}s`
              : 'none'
          }}
        />
      ))}
    </div>
  );
};
