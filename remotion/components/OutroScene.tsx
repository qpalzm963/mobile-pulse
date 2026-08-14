import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { VideoScene, VideoTheme } from '../../lib/video/types';

interface Props {
  scene: VideoScene;
  theme: VideoTheme;
}

export const OutroScene: React.FC<Props> = ({ scene, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 10 } });
  const highlights = scene.highlights || [];

  const pulse = Math.sin(frame / 10) * 0.05 + 1;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 40px',
        boxSizing: 'border-box',
        zIndex: 10,
        position: 'relative',
        textAlign: 'center',
      }}
    >
      {/* Brand Icon / Logo Circle */}
      <div
        style={{
          transform: `scale(${logoScale * pulse})`,
          width: '120px',
          height: '120px',
          borderRadius: '32px',
          background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 40px ${theme.primaryColor}88`,
          marginBottom: '32px',
        }}
      >
        <span style={{ fontSize: '56px', fontWeight: 900, color: '#FFFFFF' }}>⚡️</span>
      </div>

      {/* Main Brand Title */}
      <h1
        style={{
          fontSize: '64px',
          fontWeight: 900,
          color: theme.textColor,
          margin: '0 0 16px 0',
          letterSpacing: '-1px',
        }}
      >
        {scene.title}
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: '28px',
          color: 'rgba(248, 250, 252, 0.85)',
          margin: '0 0 40px 0',
          maxWidth: '750px',
        }}
      >
        {scene.subtitle}
      </p>

      {/* Action Badges */}
      <div
        style={{
          display: 'flex',
          gap: '20px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        {highlights.map((item, idx) => (
          <div
            key={idx}
            style={{
              padding: '16px 32px',
              borderRadius: '999px',
              backgroundColor: theme.cardBg,
              border: `1px solid ${theme.primaryColor}66`,
              color: '#FFFFFF',
              fontSize: '24px',
              fontWeight: 700,
              boxShadow: `0 4px 20px ${theme.primaryColor}33`,
            }}
          >
            🔥 {item}
          </div>
        ))}
      </div>
    </div>
  );
};
