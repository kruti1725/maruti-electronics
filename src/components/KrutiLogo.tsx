import React from 'react';

export const LOGO_SVG_STRING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" fill="none">
  <path d="M48 27 L18 52 L44 86" stroke="#111827" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M46 51 L78 27" stroke="#DC2626" stroke-width="11" stroke-linecap="round"/>
  <path d="M44 54 L84 86" stroke="#DC2626" stroke-width="11" stroke-linecap="round"/>
  <circle cx="58" cy="51" r="5" fill="#DC2626"/>
</svg>`;

export const KrutiLogo: React.FC<{ className?: string; size?: number | string }> = ({
  className = '',
  size = 32,
}) => (
  <div
    style={{ width: size, height: size }}
    className={`inline-flex items-center justify-center shrink-0 ${className}`}
    dangerouslySetInnerHTML={{ __html: LOGO_SVG_STRING }}
  />
);
