import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { VideoScene, VideoTheme } from '../../lib/video/types';

interface Props {
  scene: VideoScene;
  theme: VideoTheme;
}

// 標題列的假檔名：語言名稱直接當副檔名會變成 Snippet.typescript
const FILE_EXTENSIONS: Record<string, string> = {
  typescript: 'ts',
  javascript: 'js',
  tsx: 'tsx',
  swift: 'swift',
  kotlin: 'kt',
  dart: 'dart',
  python: 'py',
};

const CODE_LINE_HEIGHT = 1.6;
const CODE_FONT_SIZE_MAX = 22;
const CODE_FONT_SIZE_MIN = 11;
// 等寬字的字元寬度約為字級的 0.62 倍（由實際渲染結果反推）
const MONO_CHAR_WIDTH_RATIO = 0.62;

/**
 * 依最長行與行數推算塞得下的程式碼字級。
 * 影片沒有捲軸，overflow 就是直接被裁掉，所以寬高都要先算過。
 */
function fitCodeFontSize(lines: string[], compWidth: number, compHeight: number): number {
  const cardWidth = Math.min(880, compWidth - 72);      // 外層 padding 36px * 2
  const codeWidth = cardWidth - 56 - 28 - 20;           // 內距 28*2 + 行號欄 + gap
  const codeHeight = compHeight - 324;                  // 外層 padding + 標題 + 副標 + 標題列 + 內距

  const longestLine = Math.max(...lines.map((l) => l.length), 1);
  const byWidth = codeWidth / (longestLine * MONO_CHAR_WIDTH_RATIO);
  const byHeight = codeHeight / (Math.max(lines.length, 1) * CODE_LINE_HEIGHT);

  return Math.max(CODE_FONT_SIZE_MIN, Math.min(CODE_FONT_SIZE_MAX, Math.floor(Math.min(byWidth, byHeight))));
}

export const CodeCard: React.FC<Props> = ({ scene, theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const cardScale = spring({ frame, fps, config: { damping: 14 } });
  const cardOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const codeLines = (scene.codeSnippet || '').split('\n');
  const codeFontSize = fitCodeFontSize(codeLines, width, height);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '50px 36px',
        boxSizing: 'border-box',
        zIndex: 10,
        position: 'relative',
      }}
    >
      {/* Title */}
      <h2
        style={{
          fontSize: '44px',
          fontWeight: 800,
          color: theme.textColor,
          margin: '0 0 12px 0',
          textAlign: 'center',
        }}
      >
        {scene.title}
      </h2>

      {scene.subtitle && (
        <p
          style={{
            fontSize: '24px',
            color: 'rgba(248, 250, 252, 0.75)',
            margin: '0 0 28px 0',
            textAlign: 'center',
          }}
        >
          {scene.subtitle}
        </p>
      )}

      {/* Code Editor Window */}
      <div
        style={{
          transform: `scale(${cardScale})`,
          opacity: cardOpacity,
          width: '100%',
          maxWidth: '880px',
          borderRadius: '20px',
          backgroundColor: '#0F172A',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        }}
      >
        {/* Editor Titlebar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            backgroundColor: '#1E293B',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10B981' }} />
          </div>

          <span style={{ fontSize: '18px', fontWeight: 600, color: '#94A3B8', fontFamily: 'monospace' }}>
            {`Snippet.${FILE_EXTENSIONS[scene.language ?? ''] ?? 'txt'}`}
          </span>
          <div style={{ width: '40px' }} />
        </div>

        {/* Code Content */}
        <div
          style={{
            padding: '24px 28px',
            fontFamily: 'Consolas, Monaco, "Fira Code", monospace',
            fontSize: `${codeFontSize}px`,
            lineHeight: CODE_LINE_HEIGHT,
            color: '#E2E8F0',
            overflowX: 'auto',
            textAlign: 'left',
          }}
        >
          {codeLines.map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: '20px' }}>
              <span style={{ color: '#475569', width: '28px', textAlign: 'right', userSelect: 'none' }}>
                {i + 1}
              </span>
              <span style={{ whiteSpace: 'pre' }}>
                {highlightCodeLine(line)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Basic keyword styling helper
function highlightCodeLine(line: string) {
  const keywords = ['import', 'struct', 'var', 'let', 'func', 'switch', 'case', 'return', 'default', '@unknown', 'if', 'else'];
  const parts = line.split(/(\s+|\(|\)|\{|\}|\.|:)/);

  return parts.map((part, index) => {
    if (keywords.includes(part.trim())) {
      return (
        <span key={index} style={{ color: '#F472B6', fontWeight: 'bold' }}>
          {part}
        </span>
      );
    }
    if (part.startsWith('"') || part.endsWith('"')) {
      return (
        <span key={index} style={{ color: '#38BDF8' }}>
          {part}
        </span>
      );
    }
    if (part.trim().startsWith('.')) {
      return (
        <span key={index} style={{ color: '#A78BFA' }}>
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
