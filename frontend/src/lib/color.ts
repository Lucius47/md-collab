const HUE_STEP = 137.508; // golden angle — spreads hues evenly across many users

export interface UserColor {
  color: string;
  colorLight: string;
}

/** Same user id always yields the same color, no coordination needed. */
export function colorForUser(id: string): UserColor {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const hue = (hash * HUE_STEP) % 360;
  return {
    color: `hsl(${hue.toFixed(0)}, 65%, 42%)`,
    colorLight: `hsla(${hue.toFixed(0)}, 65%, 42%, 0.25)`,
  };
}
