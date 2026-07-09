'use client';

import { flagImageUrl } from '../lib/flags';

interface FlagProps {
  team: string;
  size?: number;
  className?: string;
}

/** Renders a country flag as a PNG (works on Windows Chrome where emoji flags fail). */
export function Flag({ team, size = 16, className = '' }: FlagProps) {
  const src = flagImageUrl(team, size <= 16 ? 20 : 40);
  if (!src) {
    return (
      <span
        className={`inline-block rounded-sm bg-gray-200 ${className}`}
        style={{ width: size, height: Math.round(size * 0.75) }}
        title={team}
        aria-hidden
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={Math.round(size * 0.75)}
      className={`inline-block rounded-sm object-cover align-[-2px] ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
}
