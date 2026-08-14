import React from 'react';
import { Series } from 'remotion';
import { VideoConfig } from '../../lib/video/types';
import { DynamicBackground } from '../components/DynamicBackground';
import { ProgressBar } from '../components/ProgressBar';
import { IntroScene } from '../components/IntroScene';
import { KeyPointScene } from '../components/KeyPointScene';
import { CodeCard } from '../components/CodeCard';
import { OutroScene } from '../components/OutroScene';

// 用 type 而非 interface：Remotion 的 Composition 要求 props 可指派給
// Record<string, unknown>，interface 不會有隱含索引簽章，會編譯失敗。
type Props = {
  config: VideoConfig;
};

export const ShortVideo: React.FC<Props> = ({ config }) => {
  const { theme, scenes, fps, tags } = config;

  const totalDurationInFrames = scenes.reduce(
    (acc, scene) => acc + Math.round(scene.durationInSeconds * fps),
    0
  );

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Background & Global Progress Bar */}
      <DynamicBackground theme={theme} />
      <ProgressBar theme={theme} totalDurationInFrames={totalDurationInFrames} />

      {/* Sequential Scene Series */}
      <Series>
        {scenes.map((scene) => {
          const durationInFrames = Math.round(scene.durationInSeconds * fps);

          return (
            <Series.Sequence key={scene.id} durationInFrames={durationInFrames}>
              {renderSceneContent(scene, theme, tags)}
            </Series.Sequence>
          );
        })}
      </Series>
    </div>
  );
};

function renderSceneContent(scene: VideoConfig['scenes'][0], theme: VideoConfig['theme'], tags?: string[]) {
  switch (scene.type) {
    case 'intro':
      return <IntroScene scene={scene} theme={theme} tags={tags} />;
    case 'keypoint':
      return <KeyPointScene scene={scene} theme={theme} />;
    case 'code':
      return <CodeCard scene={scene} theme={theme} />;
    case 'outro':
      return <OutroScene scene={scene} theme={theme} />;
    default:
      return <IntroScene scene={scene} theme={theme} tags={tags} />;
  }
}
