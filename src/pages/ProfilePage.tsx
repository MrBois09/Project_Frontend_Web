import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState, type FormEvent } from "react";
import GameCard from "../components/GameCard";
import ReviewerIdentity from "../components/ReviewerIdentity";
import { profileApi, toGame, wishlistApi, type BackendGame, type Profile, type Review } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const tagOptions = ["Action", "RPG", "Adventure", "FPS", "Strategy", "Horror", "Indie"];

function ProfilePage() {
  const { user, loading: authLoading, updateUser } = useAuth();
  const navigate = useNavigate();
  const { username: routeUsername } = useParams();
  const [searchParams] = useSearchParams();
  const requestedUsername = routeUsername || searchParams.get("username");
  const profileUsername = requestedUsername || user?.username;
  const isOwnProfile = Boolean(user && profileUsername === user.username);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [favoriteGames, setFavoriteGames] = useState<BackendGame[]>([]);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [section, setSection] = useState<"reviews" | "favorites">("reviews");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: "", username: "", bio: "", favoriteTags: [] as string[] });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!requestedUsername && !user) { navigate("/login"); return; }
    if (!profileUsername) return;
    let active = true;
    setLoading(true); setError(null); setFavoriteError(null); setProfile(null); setReviews([]); setFavoriteGames([]);
    void (async () => {
      const [profileResult, reviewsResult] = await Promise.allSettled([
        profileApi.get(profileUsername),
        profileApi.getReviews(profileUsername),
      ]);
      if (!active) return;
      if (profileResult.status === "rejected") throw profileResult.reason;
      setProfile(profileResult.value.data);
      setReviews(reviewsResult.status === "fulfilled" ? reviewsResult.value.data : []);
      if (isOwnProfile) {
        try {
          const wishlistResult = await wishlistApi.list();
          if (active) setFavoriteGames(wishlistResult.data);
        } catch (reason) {
          if (active) setFavoriteError(reason instanceof Error ? reason.message : "Could not load favorite games.");
        }
      }
    })()
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "Unable to load profile"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [authLoading, isOwnProfile, navigate, profileUsername, requestedUsername, user]);

  function openEditor() {
    if (!profile) return;
    setForm({ displayName: profile.displayName, username: profile.username, bio: profile.bio || "", favoriteTags: profile.favoriteTags || [] });
    setAvatar(null); setAvatarPreview(null); setSaveError(null); setSaveSuccess(null); setEditing(true);
  }

  function chooseAvatar(file: File | null) {
    setAvatar(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = form.displayName.trim();
    const username = form.username.trim();
    if (!displayName || username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      setSaveError("Enter a display name and a username with at least 3 letters, numbers, or underscores.");
      return;
    }
    setSaving(true); setSaveError(null); setSaveSuccess(null);
    try {
      const response = await profileApi.update({ displayName, username, bio: form.bio.trim(), favoriteTags: form.favoriteTags });
      let updatedUser = response.data.user;
      if (avatar) {
        const avatarResponse = await profileApi.uploadAvatar(avatar);
        updatedUser = { ...updatedUser, avatarUrl: avatarResponse.data.avatarUrl };
      }
      updateUser(updatedUser);
      setProfile((current) => current ? { ...current, ...updatedUser } : current);
      if (routeUsername && routeUsername !== updatedUser.username) {
        navigate(`/profile/${encodeURIComponent(updatedUser.username)}`, { replace: true });
      }
      setSaveSuccess("Profile updated successfully.");
      setEditing(false);
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : "Could not update your profile.");
    } finally { setSaving(false); }
  }

  if (authLoading || loading) return <main className="page-section"><p role="status">Loading profile…</p></main>;
  if (!profile || error) return <main className="page-section"><p role="alert" className="form-error">{error || "Profile unavailable"}</p></main>;
  const stats = profile.stats;
  const initial = (profile.displayName || profile.username || "G").trim().charAt(0).toUpperCase();

  return <main>
    <section className="profile-cover"><div className="profile-pattern" /><div className="profile-wrap"><span className="profile-avatar">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : initial}</span><div><h1>{profile.displayName}</h1><p>@{profile.username} · Joined {new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(profile.createdAt || Date.now()))}</p></div>{isOwnProfile ? <button className="btn secondary profile-edit-button" type="button" onClick={openEditor}>Edit profile</button> : null}</div></section>
    <section className="page-section profile-content"><div className="profile-main"><p className="profile-bio">{profile.bio?.trim() || "No bio yet."}</p><div className="platforms">{(profile.favoriteTags || []).map((tag) => <span className="badge" key={tag}>{tag}</span>)}</div>
      <div className="library-tabs profile-tabs"><button className={section === "reviews" ? "active" : ""} type="button" onClick={() => setSection("reviews")}>Reviews <span>{stats.totalReviews}</span></button>{isOwnProfile ? <button className={section === "favorites" ? "active" : ""} type="button" onClick={() => setSection("favorites")}>Favorite games <span>{favoriteGames.length}</span></button> : null}</div>
      {saveSuccess ? <p className="form-status" role="status">{saveSuccess}</p> : null}
      {isOwnProfile && section === "favorites" && favoriteError ? <p className="form-error" role="alert">{favoriteError}</p> : null}
      {isOwnProfile && section === "favorites" ? (favoriteGames.length ? <div className="profile-favorites-grid">{favoriteGames.map((game) => <GameCard game={toGame(game)} key={game._id || game.id || game.slug} />)}</div> : <div className="empty-state"><h2>No favorite games yet</h2><p>Save games from Explore Games and they will appear here.</p><Link className="btn secondary" to="/games">Explore games</Link></div>) : (reviews.length === 0 ? <div className="empty-state"><h2>No reviews yet</h2><p>This player has not published any reviews.</p></div> : reviews.map((review) => { const game = review.gameId; const gameId = game?.id || game?._id; return <article className="review-card" key={review.id || review._id || review.createdAt}><div className="review-top"><ReviewerIdentity username={review.userId?.username} displayName={review.userId?.displayName || profile.displayName} avatarUrl={review.userId?.avatarUrl} /><span className="review-time">{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(review.createdAt))}</span></div><div className="review-game">{game?.coverImageUrl ? <img src={game.coverImageUrl} alt="" /> : <span className="review-cover-fallback" aria-hidden="true" />}{gameId ? <Link to={`/games/${gameId}/reviews`}>{game?.title || "Unavailable game"}</Link> : <span>{game?.title || "Unavailable game"}</span>}<span className="rating">★ {review.rating.toFixed(1)}</span></div><h2>{review.title}</h2><p>{review.content}</p></article>; }))}
    </div><aside className="stats-card"><h2>Player stats</h2>{[[String(stats.totalReviews), "Reviews written"], [stats.averageRatingGiven.toFixed(1), "Avg. rating given"], [String(stats.helpfulVotesReceived), "Helpful votes"], ...(isOwnProfile ? [[String(stats.favoriteGamesCount), "Favorite games"]] : [])].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</aside></section>
    {editing ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditing(false); }}><section className="add-game-modal profile-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title"><header className="add-game-modal-header"><div><span className="eyebrow">Your account</span><h2 id="edit-profile-title">Edit profile</h2></div><button className="modal-close" type="button" onClick={() => setEditing(false)} disabled={saving} aria-label="Close">×</button></header><form className="add-game-form" onSubmit={(event) => void saveProfile(event)}><label>Display name<input value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} maxLength={80} required /></label><label>Username<input value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} maxLength={30} required /><small className="field-hint">Letters, numbers, and underscores only.</small></label><label>Bio<textarea value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} maxLength={500} rows={4} /></label><label>Avatar<span className="avatar-upload-control"><input className="file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseAvatar(event.target.files?.[0] || null)} />{avatarPreview || profile.avatarUrl ? <img src={avatarPreview || profile.avatarUrl} alt="Preview" /> : <span className="profile-avatar-upload-fallback">{initial}</span>}<span><strong>{avatar ? avatar.name : "Choose a new profile image"}</strong><small>JPG, PNG or WebP</small></span></span></label><fieldset className="favorite-tags-picker"><legend>Favorite tags <span>(optional)</span></legend><div>{tagOptions.map((tag) => <button type="button" className={form.favoriteTags.includes(tag) ? "selected" : ""} aria-pressed={form.favoriteTags.includes(tag)} onClick={() => setForm((current) => ({ ...current, favoriteTags: current.favoriteTags.includes(tag) ? current.favoriteTags.filter((item) => item !== tag) : [...current.favoriteTags, tag] }))} key={tag}>{tag}</button>)}</div></fieldset>{saveError ? <p className="form-error" role="alert">{saveError}</p> : null}<div className="add-game-actions"><button className="modal-cancel" type="button" onClick={() => setEditing(false)} disabled={saving}>Cancel</button><button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button></div></form></section></div> : null}
  </main>;
}
export default ProfilePage;
