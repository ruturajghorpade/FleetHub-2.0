import React from 'react';

/**
 * Official FleetHub 2.0 Brand Logo Component
 * Uses the official static brand assets with designated sizes per application location.
 *
 * Location Variants (Recommended):
 * - variant="sidebar"   -> 155px width (Main desktop sidebar branding)
 * - variant="navbar"    -> 100px width (Compact top navigation bar)
 * - variant="auth"      -> 220px width (Login and Registration forms)
 * - variant="dashboard" -> 145px width (Dashboard header / content branding)
 * - variant="mobile"    -> 120px width (Mobile sidebar / compact viewports)
 *
 * Asset Variants:
 * - variant="full"       -> Vertical logo (symbol + FLEETHUB + tagline)
 * - variant="horizontal" -> Landscape logo (symbol beside wordmark)
 * - variant="dark"       -> Vertical logo on dark canvas
 * - variant="symbol"     -> Standalone stylized "F" mark
 */
const FleetHubLogo = ({
  variant = 'sidebar',
  size,
  className = '',
  alt = 'FleetHub — Smarter Logistics',
  ...props
}) => {
  // Determine asset source based on variant
  let src = '/assets/fleethub-logo.png';
  if (variant === 'dark') {
    src = '/assets/fleethub-logo-dark.png';
  } else if (
    variant === 'navbar' ||
    variant === 'dashboard' ||
    variant === 'mobile' ||
    variant === 'horizontal' ||
    variant === 'compact'
  ) {
    src = '/assets/fleethub-logo-horizontal.png';
  } else if (variant === 'symbol' || variant === 'mark') {
    src = '/assets/fleethub-logo-mark.png';
  } else {
    // 'sidebar', 'auth', 'full', and default
    src = '/assets/fleethub-logo.png';
  }

  // Sizing definitions per location & standard presets
  const variantSizes = {
    sidebar: 'w-[155px] h-auto object-contain',
    navbar: 'w-[110px] h-auto object-contain',
    auth: 'w-[220px] h-auto object-contain',
    dashboard: 'w-[145px] h-auto object-contain',
    mobile: 'w-[110px] h-auto object-contain',
    full: 'w-[155px] h-auto object-contain',
    horizontal: 'w-[145px] h-auto object-contain',
    symbol: 'w-7 h-7 object-contain',
  };

  const explicitSizes = {
    sidebar: 'w-[155px] h-auto object-contain',
    navbar: 'w-[110px] h-auto object-contain',
    auth: 'w-[220px] h-auto object-contain',
    dashboard: 'w-[145px] h-auto object-contain',
    mobile: 'w-[110px] h-auto object-contain',
    xs: 'h-5 w-auto',
    sm: 'h-7 w-auto',
    small: 'h-7 w-auto',
    compact: 'w-[100px] h-auto object-contain',
    medium: 'w-[155px] h-auto object-contain',
    md: 'w-[155px] h-auto object-contain',
    large: 'w-[220px] h-auto object-contain',
    lg: 'w-[220px] h-auto object-contain',
    xl: 'w-[260px] h-auto object-contain',
    none: '',
    custom: '',
  };

  // Determine size class: explicit 'size' prop takes precedence, otherwise use variant's default size
  let resolvedSizeClass = '';
  if (size !== undefined && explicitSizes[size] !== undefined) {
    resolvedSizeClass = explicitSizes[size];
  } else if (variantSizes[variant] !== undefined) {
    resolvedSizeClass = variantSizes[variant];
  } else {
    resolvedSizeClass = variantSizes.sidebar;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`select-none ${resolvedSizeClass} ${className}`.trim()}
      loading="eager"
      {...props}
    />
  );
};

export default FleetHubLogo;
