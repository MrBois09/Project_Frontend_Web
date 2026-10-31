import { Link, useNavigate } from "react-router-dom";
import { games } from "../data/games";
import { useAuth } from "../context/AuthContext";
import { useRef, useState } from "react";
import { profileApi } from "../lib/api";

const favoriteTagOptions = ["Action", "RPG", "Adventure", "FPS", "Strategy", "Horror", "Indie"];

function RegisterPage() {
  const { register, logout, error } = useAuth(); const navigate = useNavigate();
  const [step, setStep] = useState(1); const [submitting, setSubmitting] = useState(false); const [formError, setFormError] = useState<string | null>(null);
  const [registeredDisplayName, setRegisteredDisplayName] = useState(""); const [favoriteTags, setFavoriteTags] = useState<string[]>([]); const [avatarPreview, setAvatarPreview] = useState<string | null>(null); const [avatarFile, setAvatarFile] = useState<File | null>(null); const [accountCreated, setAccountCreated] = useState(false); const avatarInput = useRef<HTMLInputElement>(null);
  const [pendingAccount, setPendingAccount] = useState<{ username: string; email: string; password: string; confirmPassword: string } | null>(null);
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFormError(null); const values = new FormData(event.currentTarget);
    if (step === 1) { setPendingAccount({ username: String(values.get("username")).trim(), email: String(values.get("email")).trim(), password: String(values.get("password")), confirmPassword: String(values.get("confirmPassword")) }); setRegisteredDisplayName(String(values.get("displayName")).trim()); setStep(2); return; }
    if (favoriteTags.length !== 3) { setFormError("Choose exactly 3 favorite game tags to continue."); return; }
    if (!pendingAccount) { setFormError("Please complete the account information first."); setStep(1); return; }
    setSubmitting(true); try {
      if (!accountCreated) {
        await register({ ...pendingAccount, displayName: registeredDisplayName });
        setAccountCreated(true);
      }
      await profileApi.update({
        displayName: String(values.get("displayName")).trim(),
        username: pendingAccount.username,
        bio: String(values.get("bio") || "").trim(),
        favoriteTags,
      });
      if (avatarFile) await profileApi.uploadAvatar(avatarFile);
      await logout();
      navigate("/login");
    } catch (e) { setFormError(e instanceof Error ? e.message : "Unable to save profile"); } finally { setSubmitting(false); }
  }
  function selectAvatar(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setFormError("Choose a JPG, PNG, or WebP image."); event.target.value = ""; return; } if (file.size > 5 * 1024 * 1024) { setFormError("Avatar images must be 5 MB or smaller."); return; } setFormError(null); setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
  return <main className="auth-page"><section className="auth-art" aria-label="Join the GamerReview community"><img src={games[3].image} alt="" /><div className="auth-shade" /><Link className="brand" to="/" aria-label="GamerReview home"><span className="brand-mark">GR</span><span>Gamer<span>Review</span></span></Link><blockquote>“Every great game deserves to be discovered.”</blockquote><small>Meet players who love the same worlds you do.</small></section><section className="auth-form"><span className="eyebrow">Join the community</span><h1>{step === 1 ? "Create your player profile." : "Personalize your profile."}</h1><p>Save games for later, share your honest takes, and find your next favorite.</p><form onSubmit={handleSubmit}>{step === 1 ? <><label>Display name<input type="text" name="displayName" autoComplete="nickname" placeholder="What should we call you?" maxLength={80} required /></label><label>Username<input type="text" name="username" autoComplete="username" placeholder="player_one" pattern="[A-Za-z0-9_]{3,30}" required /></label><label>Email address<input type="email" name="email" autoComplete="email" placeholder="you@example.com" required /></label><label>Password<input type="password" name="password" autoComplete="new-password" minLength={8} placeholder="8+ characters" required /></label><label>Confirm password<input type="password" name="confirmPassword" autoComplete="new-password" required /></label><label className="auth-consent"><input type="checkbox" required />I agree to the community guidelines and terms.</label></> : <><p className="registration-step">Step 2 of 2 · Profile details</p><label>Display name<input type="text" name="displayName" defaultValue={registeredDisplayName} maxLength={80} required /></label><label>Avatar image<span className="avatar-upload-control" onClick={() => avatarInput.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") avatarInput.current?.click(); }}>{avatarPreview ? <img src={avatarPreview} alt="Avatar preview" /> : <span className="profile-avatar-upload-fallback">+</span>}<span><strong>{avatarPreview ? "Change avatar" : "Upload an avatar"}</strong><small>JPG, PNG, or WebP · max 5 MB</small></span></span><input ref={avatarInput} className="file-input" type="file" name="avatar" accept="image/jpeg,image/png,image/webp" onChange={selectAvatar} /></label><label>Bio <span className="field-hint">Optional</span><textarea name="bio" maxLength={500} rows={4} placeholder="Tell the community what you play..." /></label><fieldset className="favorite-tags-picker"><legend>Favorite game tags <span>(choose exactly 3)</span></legend><div>{favoriteTagOptions.map((tag) => <button type="button" className={favoriteTags.includes(tag) ? "selected" : ""} aria-pressed={favoriteTags.includes(tag)} key={tag} onClick={() => setFavoriteTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : current.length < 3 ? [...current, tag] : current)}>{tag}</button>)}</div><small>{favoriteTags.length}/3 selected</small></fieldset></>}{(formError || error) && <p role="alert" className="form-error">{formError || error}</p>}<button className="btn" type="submit" disabled={submitting}>{submitting ? (step === 1 ? "Creating account…" : "Saving profile…") : (step === 1 ? "Continue" : "Finish profile")}</button></form><div className="auth-switch">Already a member? <Link to="/login">Log in</Link></div><small className="auth-note">Your profile starts private. You can customize it any time.</small></section></main>;
}
export default RegisterPage;
