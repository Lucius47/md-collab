import { colorForUser } from '../../lib/color';

export function Avatar({ userId, username, size = 24 }: { userId: string; username: string; size?: number }) {
  const { color } = colorForUser(userId);
  return (
    <div
      title={username}
      style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.45 }}
      className="flex shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
    >
      {username.slice(0, 1).toUpperCase()}
    </div>
  );
}
