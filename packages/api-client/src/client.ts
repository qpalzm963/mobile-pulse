import type {
  Article,
  ArticleStatus,
  ClientOptions,
  DeleteArticleResponse,
  GetArticlesResponse,
  SaveArticleResponse,
  Submission,
} from "./types.js";

export class PulseWorkbenchClient {
  private baseUrl: string;
  private apiToken?: string;
  private fetchFn: typeof fetch;

  constructor(options: ClientOptions = {}) {
    this.baseUrl = (options.baseUrl || "").replace(/\/$/, "");
    this.apiToken = options.apiToken;
    this.fetchFn = options.fetchFn || (typeof fetch !== "undefined" ? fetch.bind(globalThis) : (fetch as typeof fetch));
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers = new Headers(init.headers || {});

    if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
      headers.set("Content-Type", "application/json");
    }

    if (this.apiToken) {
      headers.set("Authorization", `Bearer ${this.apiToken}`);
      headers.set("x-admin-token", this.apiToken);
    }

    const response = await this.fetchFn(url, {
      ...init,
      headers,
    });

    const data = await response.json();
    if (!response.ok || (data && data.success === false)) {
      const errorMessage = data?.error || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return data as T;
  }

  /**
   * 取得所有文章、標籤與統計指標
   */
  async getArticles(status?: string): Promise<GetArticlesResponse> {
    const query = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
    return this.request<GetArticlesResponse>(`/api/admin/cms-articles${query}`, {
      method: "GET",
    });
  }

  /**
   * 建立新文章/草稿
   */
  async createArticle(article: Partial<Article>): Promise<SaveArticleResponse> {
    return this.request<SaveArticleResponse>("/api/admin/cms-articles", {
      method: "POST",
      body: JSON.stringify(article),
    });
  }

  /**
   * 更新文章內容或屬性
   */
  async updateArticle(id: string | number, data: Partial<Article>): Promise<SaveArticleResponse> {
    return this.request<SaveArticleResponse>("/api/admin/cms-articles", {
      method: "PATCH",
      body: JSON.stringify({ id, ...data }),
    });
  }

  /**
   * 更新文章工作流程狀態（例如看板拖曳）
   */
  async updateArticleStatus(id: string | number, status: ArticleStatus): Promise<SaveArticleResponse> {
    return this.updateArticle(id, { status });
  }

  /**
   * 刪除文章
   */
  async deleteArticle(id: string | number): Promise<DeleteArticleResponse> {
    return this.request<DeleteArticleResponse>(`/api/admin/cms-articles?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  /**
   * 取得投稿列表
   */
  async getSubmissions(): Promise<Submission[]> {
    return this.request<Submission[]>("/api/submissions", {
      method: "GET",
    });
  }

  /**
   * 取得單一投稿詳情與評分
   */
  async getSubmission(id: string | number, reviewerToken?: string): Promise<Submission> {
    const headers: Record<string, string> = {};
    if (reviewerToken) {
      headers["x-reviewer-token"] = reviewerToken;
    }
    return this.request<Submission>(`/api/submissions/${encodeURIComponent(id)}`, {
      method: "GET",
      headers,
    });
  }
}
