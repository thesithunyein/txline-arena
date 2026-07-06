export function Logo({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#115e59" />
        </linearGradient>
        <linearGradient id="logo-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>
        <linearGradient id="logo-accent" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>

      {/* Rounded square background */}
      <rect width="64" height="64" rx="16" fill="url(#logo-bg)" />

      {/* Four rising bars */}
      <g transform="translate(11, 17)">
        <rect x="0" y="18" width="7" height="12" rx="3.5" fill="url(#logo-bar)" opacity="0.7" />
        <rect x="8.5" y="11" width="7" height="19" rx="3.5" fill="url(#logo-bar)" opacity="0.85" />
        <rect x="17" y="6" width="7" height="24" rx="3.5" fill="url(#logo-bar)" opacity="0.95" />
        <rect x="25.5" y="0" width="7" height="30" rx="3.5" fill="url(#logo-accent)" />
      </g>

      {/* Soft glow on tallest bar */}
      <circle cx="41" cy="17" r="2.5" fill="#5eead4" opacity="0.3" />
    </svg>
  );
}
