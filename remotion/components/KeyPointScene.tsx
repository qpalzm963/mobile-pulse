import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { VideoScene, VideoTheme } from '../../lib/video/types';

interface Props {
  scene: VideoScene;
  theme: VideoTheme;
}

export const KeyPointScene: React.FC<Props> = ({ scene, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 14 } });
  const highlights = scene.highlights || [];

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 48px',
        boxSizing: 'border-box',
        zIndex: 10,
        position: 'relative',
      }}
    >
      {/* Badge / Header */}
      {scene.badge && (
        <div
          style={{
            fontSize: '20px',
            fontWeight: 700,
            letterSpacing: '3px',
            color: theme.primaryColor,
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}
        >
          {scene.badge}
        </div>
      )}

      {/* Scene Title */}
      <h2
        style={{
          transform: `scale(${titleScale})`,
          fontSize: '52px',
          fontWeight: 800,
          color: theme.textColor,
          margin: '0 0 40px 0',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {scene.title}
      </h2>

      {/* Highlights List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          width: '100%',
          maxWidth: '850px',
        }}
      >
        {highlights.map((text, idx) => {
          const startFrame = 10 + idx * 12;
          const cardSpring = spring({ frame: frame - startFrame, fps, config: { damping: 13 } });
          const cardY = interpolate(cardSpring, [0, 1], [50, 0]);
          const opacity = interpolate(frame - startFrame, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

          return (
            <div
              key={idx}
              style={{
                transform: `translateY(${cardY}px)`,
                opacity,
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '24px 28px',
                borderRadius: '20px',
                backgroundColor: theme.cardBg,
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}
            >
              {/* Numbered Pill */}
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '24px',
                  flexShrink: 0,
                  boxShadow: `0 4px 14px ${theme.primaryColor}66`,
                }}
              >
                {idx + 1}
              </div>

              {/* Point Description */}
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 600,
                  color: theme.textColor,
                  lineHeight: 1.35,
                  textAlign: 'left',
                }}
              >
                {text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
