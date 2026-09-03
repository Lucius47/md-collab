const DIVISIONS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
];

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatRelativeTime(iso: string): string {
  const diffSec = (new Date(iso).getTime() - Date.now()) / 1000;

  for (const [unit, secondsInUnit] of DIVISIONS) {
    if (Math.abs(diffSec) >= secondsInUnit) {
      return rtf.format(Math.round(diffSec / secondsInUnit), unit);
    }
  }
  return 'just now';
}
