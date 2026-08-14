import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { VideoScene, VideoTheme } from '../../lib/video/types';

interface Props {
  scene: VideoScene;
  theme: VideoTheme;
  tags?: string[];
}

export const IntroScene: React.FC<Props> = ({ scene, theme, tags = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Spring animations for smooth entrance
  const badgeScale = spring({ frame, fps, config: { damping: 12 } });
  const titleY = interpolate(spring({ frame: frame - 5, fps, config: { damping: 14 } }), [0, 1], [40, 0]);
  const titleOpacity = interpolate(frame, [5, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const subtitleY = interpolate(spring({ frame: frame - 12, fps, config: { damping: 14 } }), [0, 1], [30, 0]);
  const subtitleOpacity = interpolate(frame, [12, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

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
        textAlign: 'center',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Category / Badge */}
      {scene.badge && (
        <div
          style={{
            transform: `scale(${badgeScale})`,
            marginBottom: '32px',
            padding: '10px 24px',
            borderRadius: '999px',
            background: `linear-gradient(135deg, ${theme.primaryColor}33, ${theme.secondaryColor}33)`,
            border: `1px solid ${theme.primaryColor}88`,
            color: '#FFFFFF',
            fontSize: '24px',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            backdropFilter: 'blur(12px)',
            boxShadow: `0 0 20px ${theme.primaryColor}44`,
          }}
        >
          {scene.badge}
        </div>
      )}

      {/* Main Title */}
      <h1
        style={{
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          fontSize: '64px',
          fontWeight: 900,
          lineHeight: 1.15,
          color: theme.textColor,
          margin: '0 0 24px 0',
          whiteSpace: 'pre-line',
          letterSpacing: '-1px',
          background: `linear-gradient(180deg, #FFFFFF 30%, ${theme.textColor} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
        }}
      >
        {scene.title}
      </h1>

      {/* Subtitle / Teaser */}
      {scene.subtitle && (
        <p
          style={{
            transform: `translateY(${subtitleY}px)`,
            opacity: subtitleOpacity,
            fontSize: '32px',
            fontWeight: 400,
            lineHeight: 1.4,
            color: 'rgba(248, 250, 252, 0.85)',
            maxWidth: '850px',
            margin: '0 0 40px 0',
          }}
        >
          {scene.subtitle}
        </p>
      )}

      {/* Tag Pills */}
      {tags.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {tags.map((tag, idx) => {
            const tagDelay = 20 + idx * 4;
            const tagScale = spring({ frame: frame - tagDelay, fps });
            return (
              <span
                key={tag}
                style={{
                  transform: `scale(${Math.max(0, tagScale)})`,
                  padding: '8px 20px',
                  borderRadius: '12px',
                  backgroundColor: theme.cardBg,
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(248, 250, 252, 0.9)',
                  fontSize: '22px',
                  fontWeight: 600,
                }}
              >
                #{tag}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
