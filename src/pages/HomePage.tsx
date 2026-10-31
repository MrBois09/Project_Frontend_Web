import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import GameCard from "../components/GameCard";
import ReviewerIdentity from "../components/ReviewerIdentity";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { gamesApi, reviewsApi, toGame, type BackendGame, type HomeGame, type Review } from "../lib/api";
import { formatReviewCount, orderedGameTags } from "../data/games";

const categories = [
  ["Action", "2.4k games"],
  ["RPG", "1.8k games"],
  ["Adventure", "1.6k games"],
  ["FPS", "980 games"],
  ["Strategy", "980 games"],
  ["Horror", "1.2k games"],
  ["Indie", "3.1k games"],
];

function HomePage() {
  const [featuredGames, setFeaturedGames] = useState<HomeGame[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [newReleases, setNewReleases] = useState<HomeGame[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { isWishlisted, toggleWishlist, pendingIds, error: wishlistError } = useWishlist();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.allSettled([gamesApi.featured(), reviewsApi.recent(), gamesApi.newReleases()])
      .then(([featured, reviews, releases]) => {
        if (!active) return;
        const nextErrors: string[] = [];
        if (featured.status === "fulfilled") setFeaturedGames(featured.value.data.slice(0, 5).map(toGame));
        else nextErrors.push("Featured games");
        if (reviews.status === "fulfilled") setRecentReviews(reviews.value.data);
        else nextErrors.push("recent reviews");
        if (releases.status === "fulfilled") {
          const validGames = releases.value.data.filter(
            (game): game is BackendGame => Boolean(game && (game._id || game.id || game.slug)),
          );
          const newestGames = validGames
            .filter((game, index, games) => games.findIndex((candidate) => (candidate._id || candidate.id || candidate.slug) === (game._id || game.id || game.slug)) === index)
            .sort((a, b) => {
              return parseCreatedAt(b.createdAt) - parseCreatedAt(a.createdAt);
            })
            .slice(0, 3)
            .map(toGame);
          setNewReleases(newestGames);
        }
        else nextErrors.push("new releases");
        setErrors(nextErrors);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const featuredGame = featuredGames[0];
  const trendingGames = featuredGames.slice(1, 5);
  const reviewedGames = recentReviews
    .filter((review): review is Review => Boolean(review && review.gameId))
    .filter((review, index, reviews) => {
      const gameId = typeof review.gameId === "object" ? (review.gameId?.id || review.gameId?._id) : review.gameId;
      return reviews.findIndex((candidate) => (typeof candidate.gameId === "object" ? (candidate.gameId?.id || candidate.gameId?._id) : candidate.gameId) === gameId) === index;
    }).slice(0, 3);
  const isFeaturedWishlisted = featuredGame ? isWishlisted(featuredGame.id) : false;

  if (loading) return <main><div className="page-loading" role="status">Loading home page...</div></main>;

  return (
    <main>
      <section className="hero">
        {featuredGame ? <img src={featuredGame.bannerImage || featuredGame.image} alt="" /> : <div className="hero-overlay" />}
        <div className="hero-overlay" />
        <div className="hero-content">
          <span className="feature-label">
            <span aria-hidden="true">✦</span> Featured this week
          </span>
          {featuredGame ? <>
          <h1>
            {featuredGame.title.split(" ")[0]}
            <br />
            <em>{featuredGame.title.split(" ").slice(1).join(" ")}</em>
          </h1>
          <p>{featuredGame.description || "Discover what the community is playing and reviewing right now."}</p>
          <div className="hero-meta">
            <span className="rating">
              <span aria-hidden="true">★</span> {featuredGame.rating.toFixed(1)}
            </span>
            <span>{formatReviewCount(featuredGame.reviewCount)} reviews</span>
            {orderedGameTags(featuredGame.genre, featuredGame.platforms).map((tag, index) => <span className="hero-badge" key={`${tag}-${index}`}>{tag}</span>)}
          </div>
          <div className="hero-actions">
            <Link className="btn" to={`/games/${featuredGame.id}/reviews`}>
              Explore game <span aria-hidden="true">→</span>
            </Link>
            <button
              aria-pressed={isFeaturedWishlisted}
              className="btn secondary"
              disabled={authLoading || pendingIds.includes(featuredGame.id)}
              onClick={() => {
                if (!user) { navigate("/login"); return; }
                void toggleWishlist(featuredGame.id);
              }}
              type="button"
            >
              <span aria-hidden="true">{isFeaturedWishlisted ? "♥" : "♡"}</span>
              {isFeaturedWishlisted ? "In wishlist" : "Add to wishlist"}
            </button>{!user && <small>Log in to save games to your wishlist.</small>}{wishlistError && <small role="alert">{wishlistError}</small>}
          </div>
          </> : <><h1>Find your next<br /><em>favorite game</em></h1><p>No featured games are available right now.</p></>}
        </div>
        <div className="carousel" aria-label="Featured game 1 of 3">
          <span>01</span>
          <span className="carousel-lines" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <Link className="btn secondary" to="/games" aria-label="Browse games">
            →
          </Link>
        </div>
      </section>

      <section className="page-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">What's hot</span>
            <h2>Trending games</h2>
          </div>
          <Link to="/games">View all games →</Link>
        </div>
        <div className="game-grid">
          {trendingGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>

      <section className="page-section categories-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Find your next obsession</span>
            <h2>Browse by category</h2>
          </div>
        </div>
        <div className="category-grid">
          {categories.map(([category, count], index) => (
            <Link
              to={`/games?genre=${encodeURIComponent(category)}`}
              key={category}
            >
              <span>0{index + 1}</span>
              <div>
                <h3>{category}</h3>
                <p>{count}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-section split-section">
        <div>
          <div className="section-head">
            <div>
              <span className="eyebrow">Community pulse</span>
              <h2>Recently reviewed</h2>
            </div>
            <Link to="/reviews">All reviews →</Link>
          </div>
          {reviewedGames.length ? reviewedGames.map((review) => {
            const reviewGame = review.gameId && typeof review.gameId === "object" ? review.gameId : undefined;
            const reviewer = typeof review.userId === "object" ? review.userId : undefined;
            const gameId = reviewGame?.id || reviewGame?._id;
            return <article className="review-card" key={review.id || review._id}>
            <div className="review-top">
              <ReviewerIdentity username={reviewer?.username} displayName={reviewer?.displayName} avatarUrl={reviewer?.avatarUrl} fallback="Community member" />
              <span className="review-time">{formatRelativeTime(review.createdAt)}</span>
            </div>
            <div className="review-game">
              <img src={reviewGame?.coverImageUrl || ""} alt="" />
              <Link to={gameId ? `/games/${gameId}/reviews` : "/games"}>
                {reviewGame?.title || "Game"}
              </Link>
              <span className="rating">★ {review.rating.toFixed(1)}</span>
            </div>
            <div className="platforms">
              {orderedGameTags(reviewGame?.genres, reviewGame?.platforms).map((tag, index) => <span className="badge" key={`${tag}-${index}`}>{tag}</span>)}
            </div>
            <h2>{review.title}</h2><p>{review.content}</p>
          </article>;
          }) : <div className="empty-state"><h2>No recent reviews yet</h2><p>{errors.includes("recent reviews") ? "Recent reviews could not be loaded." : "Be the first to share a take."}</p></div>}
        </div>
        <div>
          <div className="section-head">
            <div>
              <span className="eyebrow">Fresh arrivals</span>
              <h2>New releases</h2>
            </div>
          </div>
          <div className="mini-list">
            {newReleases.map((game, index) => (
              <Link to={`/games/${game.id}/reviews`} key={game.id}>
                <img src={game.image} alt="" loading="lazy" />
                <span>
                  <b>{game.title}</b>
                  <small>{orderedGameTags(game.genre, game.platforms).join(" · ") || "Game"}{game.year ? ` · ${game.year}` : ""}</small>
                </span>
                <em>0{index + 1}</em>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="newsletter">
        <span className="eyebrow">Stay in the loop</span>
        <h2>Good games. Great takes.</h2>
        <p>Discover the next game worth staying up late for.</p>
        <Link className="btn" to="/games">Explore the catalog</Link>
      </section>
    </main>
  );
}

function parseCreatedAt(value?: string) {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

function formatRelativeTime(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 60) return `${minutes || 1} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default HomePage;
