export function Logo({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="logo-bolt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="logo-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>

      {/* Background with subtle gradient */}
      <rect width="64" height="64" rx="16" fill="url(#logo-bg)" />

      {/* Arena ring — represents the competitive arena */}
      <ellipse
        cx="32"
        cy="34"
        rx="22"
        ry="14"
        fill="none"
        stroke="url(#logo-ring)"
        strokeWidth="2.5"
        opacity="0.35"
      />
      <ellipse
        cx="32"
        cy="34"
        rx="16"
        ry="10"
        fill="none"
        stroke="url(#logo-ring)"
        strokeWidth="1.5"
        opacity="0.2"
      />

      {/* Lightning bolt — represents sharp movement detection */}
      <path
        d="M35 12 L20 36 h9 L24 54 L44 28 h-11 z"
        fill="url(#logo-bolt)"
        stroke="#065f46"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />

      {/* Glow effect on bolt tip */}
      <circle cx="44" cy="28" r="2" fill="#34d399" opacity="0.6" />

      {/* Top border accent */}
      <rect x="0" y="0" width="64" height="3" rx="1.5" fill="url(#logo-bolt)" opacity="0.5" />
    </svg>
  );
}
