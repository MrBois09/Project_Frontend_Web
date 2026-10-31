import { Link } from "react-router-dom";

type ReviewerIdentityProps = {
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  fallback?: string;
};

function ReviewerIdentity({ username, displayName, avatarUrl, fallback = "Player" }: ReviewerIdentityProps) {
  const name = displayName || username || fallback;
  const content = <>
    <span className="avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : name.slice(0, 2).toUpperCase()}</span>
    <span><b>{name}</b><small>{username ? `@${username}` : "Community member"}</small></span>
  </>;

  return username
    ? <Link className="reviewer reviewer-link" to={`/profile/${encodeURIComponent(username)}`}>{content}</Link>
    : <div className="reviewer">{content}</div>;
}

export default ReviewerIdentity;
