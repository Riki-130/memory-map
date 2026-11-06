export default function Avatar({ member, size = 28 }) {
  const initial = (member.displayName || member.email || "?").slice(0, 1);
  return member.photoURL ? (
    <img className="avatar" src={member.photoURL} alt={member.displayName} width={size} height={size} referrerPolicy="no-referrer" />
  ) : (
    <span className="avatar avatar-fallback" style={{ width: size, height: size }}>{initial}</span>
  );
}
