import React from 'react';
import { Composition } from 'remotion';
import { ShortVideo } from './compositions/ShortVideo';
import videoConfigJson from '../data/video-config.json';
import { VideoConfig } from '../lib/video/types';

// data/video-config.json 由 `npm run video:create` 產生，是影片內容的唯一來源。
// JSON 推不出 SceneType 的字面量型別，故在此收斂一次。
const config = videoConfigJson as VideoConfig;

export const RemotionRoot: React.FC = () => {
  const { fps } = config;
  const totalDurationInFrames = config.scenes.reduce(
    (acc, scene) => acc + Math.round(scene.durationInSeconds * fps),
    0
  );

  return (
    <>
      {/* 9:16 Vertical Short Video (Shorts/Reels) */}
      <Composition
        id="ShortVideoVertical"
        component={ShortVideo}
        durationInFrames={totalDurationInFrames}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={{
          config,
        }}
      />

      {/* 16:9 Horizontal Video */}
      <Composition
        id="ShortVideoHorizontal"
        component={ShortVideo}
        durationInFrames={totalDurationInFrames}
        fps={fps}
        width={1920}
        height={1080}
        defaultProps={{
          config,
        }}
      />
    </>
  );
};
