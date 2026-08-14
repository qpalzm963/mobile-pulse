export type SceneType = 'intro' | 'keypoint' | 'code' | 'outro';

export interface VideoScene {
  id: string;
  type: SceneType;
  title: string;
  subtitle?: string;
  description?: string;
  highlights?: string[];
  codeSnippet?: string;
  language?: string;
  durationInSeconds: number; // Duration of this specific scene
  badge?: string;
}

export interface VideoTheme {
  primaryColor: string;    // Accent gradient start (e.g., '#3B82F6')
  secondaryColor: string;  // Accent gradient end (e.g., '#8B5CF6')
  backgroundColor: string; // Base dark background (e.g., '#0F172A')
  textColor: string;       // Primary text color (e.g., '#F8FAFC')
  cardBg: string;          // Glassmorphism card bg (e.g., 'rgba(30, 41, 59, 0.7)')
}

export interface VideoConfig {
  id: string;
  topic: string;
  mainTitle: string;
  subtitle: string;
  tags: string[];
  fps: number;
  theme: VideoTheme;
  scenes: VideoScene[];
}
