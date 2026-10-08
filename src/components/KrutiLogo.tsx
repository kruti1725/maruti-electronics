import React from 'react';

interface LogoProps {
  className?: string;
  size?: number | string;
  variant?: 'full' | 'monochrome';
}

/**
 * Kruti Electronics Brand Logo Component
 * Authentic TV Repair & Electronics service brand emblem:
 * Stylish TV Screen / Monitor housing with vibrant red circuit repair pulse and bold stylized "K E"
 */
export const KrutiLogo: React.FC<LogoProps> = ({
  className = 'w-8 h-8',
  size,
  variant = 'full',
}) => {
  const primaryColor = variant === 'monochrome' ? '#000000' : '#0F172A'; // Slate-900 / Black
  const accentRed = variant === 'monochrome' ? '#000000' : '#DC2626'; // Vibrant Red

  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
      style={style}
      fill="none"
    >
      <defs>
        <linearGradient id="kruti-grad-red" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
      </defs>

      {/* Modern TV / Monitor Chassis Frame with rounded corners */}
      <rect
        x="8"
        y="12"
        width="84"
        height="64"
        rx="14"
        stroke={primaryColor}
        strokeWidth="6"
        fill="#F8FAFC"
      />

      {/* TV Stand Base */}
      <path
        d="M38 76 L32 88 L68 88 L62 76"
        fill={primaryColor}
      />
      <rect
        x="24"
        y="88"
        width="52"
        height="4.5"
        rx="2.25"
        fill={primaryColor}
      />

      {/* Screen Antenna / Signal Beacon indicator in top corner */}
      <circle cx="81" cy="23" r="3.5" fill={accentRed} />

      {/* Stylized 'K' (Black/Dark Left Wing) */}
      <path
        d="M26 26 L26 62"
        stroke={primaryColor}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M45 28 L27 44 L46 62"
        stroke={primaryColor}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Stylized 'E' (Bold Red with Tech Circuit Crossbar) */}
      <path
        d="M74 27 L54 27 L54 62 L74 62"
        stroke="url(#kruti-grad-red)"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Center 'E' bar with electronic pulse arrow */}
      <path
        d="M54 44.5 L70 44.5"
        stroke={accentRed}
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* TV Screen Spark / Pulse Node */}
      <circle cx="70" cy="44.5" r="3" fill="#DC2626" />
    </svg>
  );
};

export const LOGO_SVG_STRING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect x="8" y="12" width="84" height="64" rx="14" stroke="#0F172A" stroke-width="6" fill="#F8FAFC"/><path d="M38 76 L32 88 L68 88 L62 76" fill="#0F172A"/><rect x="24" y="88" width="52" height="4.5" rx="2.25" fill="#0F172A"/><circle cx="81" cy="23" r="3.5" fill="#DC2626"/><path d="M26 26 L26 62" stroke="#0F172A" stroke-width="7" stroke-linecap="round"/><path d="M45 28 L27 44 L46 62" stroke="#0F172A" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M74 27 L54 27 L54 62 L74 62" stroke="#DC2626" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M54 44.5 L70 44.5" stroke="#DC2626" stroke-width="6" stroke-linecap="round"/><circle cx="70" cy="44.5" r="3" fill="#DC2626"/></svg>`;

export const LOGO_MONO_SVG_STRING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect x="8" y="12" width="84" height="64" rx="14" stroke="#000000" stroke-width="6" fill="#FFFFFF"/><path d="M38 76 L32 88 L68 88 L62 76" fill="#000000"/><rect x="24" y="88" width="52" height="4.5" rx="2.25" fill="#000000"/><circle cx="81" cy="23" r="3.5" fill="#000000"/><path d="M26 26 L26 62" stroke="#000000" stroke-width="7" stroke-linecap="round"/><path d="M45 28 L27 44 L46 62" stroke="#000000" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M74 27 L54 27 L54 62 L74 62" stroke="#000000" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M54 44.5 L70 44.5" stroke="#000000" stroke-width="6" stroke-linecap="round"/><circle cx="70" cy="44.5" r="3" fill="#000000"/></svg>`;