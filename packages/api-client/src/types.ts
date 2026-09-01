export type ArticleStatus = "idea" | "draft" | "review" | "published";

export interface Tag {
  id: string | number;
  tagId: string;
  name: string;
}

export interface ArticleStats {
  views: number;
  useful: number;
  notUseful: number;
  usefulRate: number | null;
  lastFeedbackAt?: string | null;
}

export interface Article {
  id: string | number;
  title: string;
  slug: string;
  summary: string;
  eyebrow?: string;
  status: ArticleStatus;
  contentMarkdown?: string;
  author?: string;
  readTime?: string;
  publishedAt?: string;
  updatedAt?: string;
  tags?: Array<Tag | string | number>;
  stats?: ArticleStats;
}

export interface WorkflowColumn {
  status: ArticleStatus;
  label: string;
  description: string;
}

export interface Annotation {
  id: string;
  startOffset: number;
  endOffset: number;
  highlightedText: string;
  comment: string;
  createdAt: string;
}

export interface RatingStats {
  count: number;
  avgDepth: number;
  avgClarity: number;
  avgPracticality: number;
  overallAvg: number;
}

export interface UserRating {
  scoreDepth: number;
  scoreClarity: number;
  scorePracticality: number;
  generalFeedback: string | null;
}

export interface Submission {
  id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  authorAlias: string;
  tags: string[];
  status: "draft" | "reviewing" | "approved" | "published" | "rejected";
  createdAt: string;
  ratingStats: RatingStats;
  myRating: UserRating | null;
  annotations: Annotation[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface GetArticlesResponse {
  success: boolean;
  articles: Article[];
  tags: Tag[];
  stats: ArticleStats[];
  error?: string;
}

export interface SaveArticleResponse {
  success: boolean;
  article?: Article;
  error?: string;
}

export interface DeleteArticleResponse {
  success: boolean;
  error?: string;
}

export interface ClientOptions {
  baseUrl?: string;
  apiToken?: string;
  fetchFn?: typeof fetch;
}
