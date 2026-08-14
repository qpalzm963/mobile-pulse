import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { VideoTheme } from '../../lib/video/types';

interface Props {
  theme: VideoTheme;
  totalDurationInFrames: number;
}

export const ProgressBar: React.FC<Props> = ({ theme, totalDurationInFrames }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  const progress = Math.min(1, Math.max(0, frame / totalDurationInFrames));
  const barWidth = interpolate(progress, [0, 1], [0, width]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: `${barWidth}px`,
          height: '100%',
          background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
          boxShadow: `0 0 12px ${theme.primaryColor}`,
          borderRadius: '0 4px 4px 0',
        }}
      />
    </div>
  );
};
