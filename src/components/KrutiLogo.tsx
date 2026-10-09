import React from 'react';

interface LogoProps {
  className?: string;
  size?: number | string;
  variant?: 'full' | 'monochrome';
}

/**
 * Kruti Electronics Brand Official Logo Component
 * Upright & Perfectly Horizontal Centered Alignment:
 * - Left: Black geometric angle (<) for 'K'
 * - Right: Red geometric 'E' / 'e' with horizontal crossbar and top/bottom curves
 */
export const KrutiLogo: React.FC<LogoProps> = ({
  className = 'w-8 h-8',
  size,
  variant = 'full',
}) => {
  const blackColor = variant === 'monochrome' ? '#000000' : '#111827';
  const redColor = variant === 'monochrome' ? '#000000' : '#DC2626';

  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
      style={style}
      fill="none"
    >
      {/* 
        LEFT ELEMENT: Black '<' Angle Arm (K)
        Symmetric & perfectly upright: Top (46, 18) -> Left Corner (12, 50) -> Bottom (46, 82)
      */}
      <path
        d="M 46 18 L 12 50 L 46 82"
        stroke={blackColor}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* 
        RIGHT ELEMENT: Red 'e' structure
        Straight Horizontal Center Bar at y=50: from x=48 to x=88
      */}
      <path
        d="M 48 50 L 88 50"
        stroke={redColor}
        strokeWidth="10"
        strokeLinecap="round"
      />

      {/* 
        Top circular arc of 'e':
        From top-left (52, 22) arching clockwise down to center bar right (88, 50)
      */}
      <path
        d="M 52 22 A 32 32 0 0 1 88 50"
        stroke={redColor}
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />

      {/* 
        Bottom circular arc of 'e':
        From center right (88, 50) curving down and sweeping to bottom left (52, 78)
      */}
      <path
        d="M 88 50 A 32 32 0 0 1 52 78"
        stroke={redColor}
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
};

export const LOGO_SVG_STRING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><path d="M 46 18 L 12 50 L 46 82" stroke="#111827" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M 48 50 L 88 50" stroke="#DC2626" stroke-width="10" stroke-linecap="round"/><path d="M 52 22 A 32 32 0 0 1 88 50" stroke="#DC2626" stroke-width="10" stroke-linecap="round" fill="none"/><path d="M 88 50 A 32 32 0 0 1 52 78" stroke="#DC2626" stroke-width="10" stroke-linecap="round" fill="none"/></svg>`;

export const LOGO_MONO_SVG_STRING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><path d="M 46 18 L 12 50 L 46 82" stroke="#000000" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M 48 50 L 88 50" stroke="#000000" stroke-width="10" stroke-linecap="round"/><path d="M 52 22 A 32 32 0 0 1 88 50" stroke="#000000" stroke-width="10" stroke-linecap="round" fill="none"/><path d="M 88 50 A 32 32 0 0 1 52 78" stroke="#000000" stroke-width="10" stroke-linecap="round" fill="none"/></svg>`;
