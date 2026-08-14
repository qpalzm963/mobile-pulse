import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { VideoTheme } from '../../lib/video/types';

interface Props {
  theme: VideoTheme;
}

export const DynamicBackground: React.FC<Props> = ({ theme }) => {
  const frame = useCurrentFrame();

  // Floating background blobs animation
  const orb1X = interpolate(Math.sin(frame / 45), [-1, 1], [-50, 150]);
  const orb1Y = interpolate(Math.cos(frame / 60), [-1, 1], [-100, 100]);

  const orb2X = interpolate(Math.cos(frame / 50), [-1, 1], [-100, 100]);
  const orb2Y = interpolate(Math.sin(frame / 40), [-1, 1], [-50, 150]);

  // Subtle opacity pulse for background grid
  const gridOpacity = interpolate(Math.sin(frame / 30), [-1, 1], [0.03, 0.08]);

  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        backgroundColor: theme.backgroundColor,
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {/* Background Gradient Mesh */}
      <div
        style={{
          position: 'absolute',
          top: `-20%`,
          left: `-20%`,
          width: '80%',
          height: '80%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.primaryColor}55 0%, transparent 70%)`,
          filter: 'blur(90px)',
          transform: `translate(${orb1X}px, ${orb1Y}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: `-20%`,
          right: `-20%`,
          width: '80%',
          height: '80%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.secondaryColor}44 0%, transparent 70%)`,
          filter: 'blur(90px)',
          transform: `translate(${orb2X}px, ${orb2Y}px)`,
        }}
      />

      {/* Cyber Grid Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          opacity: gridOpacity,
        }}
      />

      {/* Dark Overlay Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
        }}
      />
    </div>
  );
};
