import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { gamesApi, type BackendGame } from "./lib/api";

const HomePage = lazy(() => import("./pages/HomePage"));
const AllReviewsPage = lazy(() => import("./pages/AllReviewsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const ReviewsPage = lazy(() => import("./pages/ReviewsPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

const navigation = [
  { label: "Home", to: "/", end: true },
  { label: "Explore Games", to: "/games" },
  { label: "Reviews", to: "/reviews" },
  { label: "My Library", to: "/library" },
];

function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      navigate("/login");
    } catch {
      // Keep the current session visible when the server could not complete logout.
    }
  }

  return (
    <div className="app">
      <header className="navbar">
        <div className="nav-inner">
          <NavLink to="/" className="brand" aria-label="GamerReview home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.5 5h11a4 4 0 0 1 3.7 5.5l-2.1 5.3a2.4 2.4 0 0 1-3.9.8L13.6 15h-3.2l-1.6 1.6a2.4 2.4 0 0 1-3.9-.8l-2.1-5.3A4 4 0 0 1 6.5 5Z" />
                <path d="M6 11h4m-2-2v4" />
                <circle cx="16" cy="10" r=".7" fill="currentColor" />
                <circle cx="18" cy="13" r=".7" fill="currentColor" />
              </svg>
            </span>
            <span>Gamer<span>Review</span></span>
          </NavLink>
          <nav
            aria-label="Main navigation"
            className={`nav-links${mobileMenuOpen ? " open" : ""}`}
          >
            {navigation.map(({ label, to, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  isActive ? "active" : ""
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="nav-actions">
            <HeaderGameSearch />
            {user ? <>
              <button type="button" className="auth-nav-link" onClick={() => void handleLogout()}>Log out</button>
              <NavLink to="/profile" className="avatar" aria-label="Your profile">{user.displayName.slice(0, 2).toUpperCase()}</NavLink>
            </> : <>
              <NavLink to="/login" className="auth-nav-link">Log in</NavLink>
              <NavLink to="/register" className="btn nav-signup">Sign up</NavLink>
            </>}
            <button
              type="button"
              className="menu-toggle"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d={mobileMenuOpen ? "m6 6 12 12M18 6 6 18" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <div className="site-content">
        <Suspense
          fallback={
            <div className="page-loading" role="status">Loading page...</div>
          }
        >
          <Outlet />
        </Suspense>
      </div>
      <footer className="site-footer">
        <div className="footer-brand">
          <span className="brand-mark" aria-hidden="true">GR</span>
          <span>Gamer<span>Review</span></span>
        </div>
        <p>Find your next favorite game through players who know it best.</p>
        <div className="footer-bottom">
          <span>© 2026 GamerReview</span>
          <span>Made for players, by players.</span>
        </div>
      </footer>
    </div>
  );
}

function HeaderGameSearch() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BackendGame[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleOutsidePointer(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutsidePointer);
    return () => document.removeEventListener("mousedown", handleOutsidePointer);
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();
    const requestId = ++requestRef.current;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (trimmedQuery.length < 1) {
        setResults([]);
        setLoading(false);
        setError("");
        setActiveIndex(-1);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await gamesApi.list({ search: trimmedQuery, limit: 10, sort: "popular" });
        if (cancelled || requestId !== requestRef.current) return;
        setResults(response.data || []);
        setActiveIndex(-1);
      } catch {
        if (cancelled || requestId !== requestRef.current) return;
        setResults([]);
        setActiveIndex(-1);
        setError("Search is unavailable right now.");
      } finally {
        if (!cancelled && requestId === requestRef.current) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  function openGame(game: BackendGame) {
    const gameId = game.slug || game._id || game.id;
    if (!gameId) return;
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
    navigate(`/games/${encodeURIComponent(gameId)}/reviews`);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % results.length);
      return;
    }
    if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (!loading && results.length) openGame(results[activeIndex >= 0 ? activeIndex : 0]);
    }
  }

  const showDropdown = open && query.trim().length >= 1;

  return (
    <div className="nav-search-wrap" ref={searchRef}>
      <div className="nav-search" role="combobox" aria-expanded={showDropdown} aria-haspopup="listbox" aria-owns="header-game-search-results">
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          aria-controls="header-game-search-results"
          aria-label="Search games"
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `header-game-result-${activeIndex}` : undefined}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search games..."
          value={query}
        />
        <kbd>⌘ K</kbd>
      </div>
      {showDropdown ? (
        <div className="header-game-results" id="header-game-search-results" role="listbox" aria-label="Game search results">
          {loading ? <div className="header-game-search-status" role="status">Searching…</div> : error ? <div className="header-game-search-status" role="alert">{error}</div> : results.length === 0 ? <div className="header-game-search-status">No games found.</div> : results.map((game, index) => {
            const gameId = game.slug || game._id || game.id || String(index);
            const year = game.releaseYear || (game.releaseDate ? new Date(game.releaseDate).getFullYear() : undefined);
            return <button
              aria-selected={activeIndex === index}
              className={`header-game-result${activeIndex === index ? " active" : ""}`}
              id={`header-game-result-${index}`}
              key={gameId}
              onClick={() => openGame(game)}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              role="option"
              type="button"
            >
              {game.coverImageUrl || game.bannerImageUrl ? <img src={game.coverImageUrl || game.bannerImageUrl} alt="" /> : <span className="header-game-cover-fallback" aria-hidden="true" />}
              <span className="header-game-result-copy"><strong>{game.title}</strong><small>{[game.averageRating ? `★ ${game.averageRating.toFixed(1)}` : "", year, game.genres?.slice(0, 2).join(" · ")].filter(Boolean).join(" · ") || "Game details"}</small></span>
            </button>;
          })}
        </div>
      ) : null}
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="reviews" element={<AllReviewsPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="games" element={<ExplorePage />} />
        <Route path="games/:gameId/reviews" element={<ReviewsPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="profile/:username" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
