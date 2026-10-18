const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://proj-backend-web.vercel.app/api").replace(/\/$/, "");

export type ApiResponse<T> = { success: boolean; message: string; data: T; pagination?: { page: number; limit: number; total: number; totalPages: number } };

let csrfToken: string | undefined;

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  const response = await fetch(`${API_BASE_URL}/auth/csrf`, { credentials: "include" });
  const body = await response.json();
  csrfToken = body.data?.csrfToken;
  return csrfToken;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const token = await getCsrfToken();
    if (token) headers.set("X-CSRF-Token", token);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: "include" });
  const body = (await response.json().catch(() => ({}))) as Partial<ApiResponse<T>> & { message?: string };
  if (!response.ok) throw new Error(body.message || "Request failed");
  return body as ApiResponse<T>;
}

export type User = {
  id: string; displayName: string; username: string; email: string;
  avatarUrl?: string; bio?: string; favoriteTags?: string[]; createdAt?: string; emailVerified?: boolean;
};

export type Profile = User & { stats: { totalReviews: number; averageRatingGiven: number; helpfulVotesReceived: number; favoriteGamesCount: number } };
export type Review = { id?: string; _id?: string; title: string; content: string; rating: number; createdAt: string; updatedAt?: string; helpfulCount?: number; notHelpfulCount?: number; likesCount?: number; likeCount?: number; tags?: string[]; userId?: { id?: string; _id?: string; username?: string; displayName?: string; avatarUrl?: string }; gameId: { id?: string; _id?: string; title: string; slug?: string; coverImageUrl?: string; genres?: string[]; platforms?: string[] } };

export type BackendGame = {
  _id: string;
  id?: string;
  slug: string;
  title: string;
  coverImageUrl?: string;
  coverPublicId?: string;
  bannerImageUrl?: string;
  description?: string;
  developer?: string;
  genres?: string[];
  platforms?: string[];
  releaseDate?: string;
  releaseYear?: number;
  averageRating?: number;
  reviewCount?: number;
  createdAt?: string;
  updatedAt?: string;
  submittedBy?: string | { id?: string; _id?: string; username?: string; displayName?: string };
};

export function toGame(game: BackendGame) {
  return {
    id: game._id || game.id || game.slug,
    title: game.title,
    year: game.releaseYear ?? (game.releaseDate ? new Date(game.releaseDate).getFullYear() : 0),
    genre: game.genres ?? [],
    platforms: game.platforms ?? [],
    rating: game.averageRating ?? 0,
    reviewCount: game.reviewCount ?? 0,
    image: game.coverImageUrl || game.bannerImageUrl || "",
    bannerImage: game.bannerImageUrl || game.coverImageUrl || "",
    description: game.description ?? "",
    slug: game.slug,
    createdAt: game.createdAt,
    submittedBy: game.submittedBy,
  };
}

export type HomeGame = ReturnType<typeof toGame>;

export const authApi = {
  login: (identifier: string, password: string) => apiRequest<{ user: User }>("/auth/login", {
    method: "POST", body: JSON.stringify({ identifier, password })
  }),
  register: (payload: { displayName: string; username: string; email: string; password: string; confirmPassword: string }) =>
    apiRequest<{ user: User }>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  me: () => apiRequest<{ user: User }>("/auth/me"),
  logout: () => apiRequest<null>("/auth/logout", { method: "POST" })
};

export const profileApi = {
  get: (username: string) => apiRequest<Profile>(`/users/${encodeURIComponent(username)}`),
  getReviews: (username: string) => apiRequest<Review[]>(`/users/${encodeURIComponent(username)}/reviews?sort=mostRecent&limit=50`),
  update: (payload: { displayName?: string; username?: string; bio?: string; favoriteTags?: string[] }) => apiRequest<{ user: User }>("/users/me", { method: "PATCH", body: JSON.stringify(payload) }),
  uploadAvatar: (file: File) => { const body = new FormData(); body.append("image", file); return apiRequest<{ avatarUrl: string }>("/uploads/avatar/profile", { method: "POST", body }); }
};

export const gamesApi = {
  list: (params: { search?: string; genre?: string; platform?: string; minRating?: number; sort?: string; page?: number; limit?: number; communityAdded?: boolean } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
    return apiRequest<BackendGame[]>(`/games${query.toString() ? `?${query}` : ""}`);
  },
  detail: (idOrSlug: string) => apiRequest<{ game: BackendGame; ratingDistribution: Record<string, number> }>(`/games/${encodeURIComponent(idOrSlug)}`),
  reviews: (gameId: string, page = 1, limit = 50) => apiRequest<Review[]>(`/games/${encodeURIComponent(gameId)}/reviews?page=${page}&limit=${limit}`),
  tags: () => apiRequest<string[]>("/games/tags"),
  platforms: () => apiRequest<string[]>("/games/platforms"),
  uploadCover: (file: File) => { const body = new FormData(); body.append("image", file); return apiRequest<{ image: { url: string; publicId: string } }>("/uploads/game-cover", { method: "POST", body }); },
  create: (payload: { title: string; coverImageUrl: string; coverPublicId: string; description: string; releaseDate?: string; developer?: string; genres?: string[]; platforms?: string[] }) => apiRequest<BackendGame>("/games", { method: "POST", body: JSON.stringify(payload) }),
  update: (gameId: string, payload: { title?: string; coverImageUrl?: string; coverPublicId?: string; description?: string; releaseDate?: string; developer?: string; genres?: string[]; platforms?: string[] }) => apiRequest<BackendGame>(`/games/${encodeURIComponent(gameId)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  featured: () => apiRequest<BackendGame[]>("/games/featured?limit=5"),
  // The curated /games/new-releases route sorts by official releaseDate.
  // The catalog route exposes the backend-supported createdAt ordering instead.
  newReleases: () => apiRequest<BackendGame[]>("/games?sort=recentlyAdded&limit=3"),
};

export const reviewsApi = {
  list: (params: { search?: string; sort?: string; tag?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
    return apiRequest<Review[]>(`/reviews${query.toString() ? `?${query}` : ""}`);
  },
  recent: () => apiRequest<Review[]>("/reviews/recent?limit=12"),
  vote: (reviewId: string, type: "helpful" | "notHelpful") => apiRequest<{ liked: boolean; helpfulVote: "helpful" | "notHelpful" | null }>(`/reviews/${encodeURIComponent(reviewId)}/vote`, { method: "POST", body: JSON.stringify({ type }) }),
  create: (gameId: string, payload: { title: string; content: string; rating: number; tags?: string[] }) => apiRequest<Review>(`/games/${encodeURIComponent(gameId)}/reviews`, { method: "POST", body: JSON.stringify(payload) }),
  update: (reviewId: string, payload: { title?: string; content?: string; rating?: number; tags?: string[] }) => apiRequest<Review>(`/reviews/${encodeURIComponent(reviewId)}`, { method: "PATCH", body: JSON.stringify(payload) }),
};

export const wishlistApi = {
  list: () => apiRequest<Array<BackendGame & { savedAt?: string }>>("/users/me/wishlist?sort=newest&limit=50"),
  add: (gameId: string) => apiRequest<{ gameId: string; saved: boolean }>(`/users/me/wishlist/${gameId}`, { method: "POST" }),
  remove: (gameId: string) => apiRequest<{ gameId: string; saved: boolean }>(`/users/me/wishlist/${encodeURIComponent(gameId)}`, { method: "DELETE" }),
};

export const favoritesApi = {
  list: () => apiRequest<Array<BackendGame & { savedAt?: string }>>("/users/me/favorites?sort=newest&limit=50"),
  remove: (gameId: string) => apiRequest<{ gameId: string; saved: boolean }>(`/users/me/favorites/${encodeURIComponent(gameId)}`, { method: "DELETE" }),
};
