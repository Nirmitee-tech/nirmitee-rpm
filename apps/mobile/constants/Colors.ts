// NirmiteeRPM Mobile - Colors matching web app brand
// Primary brand color: #745EE1 (Purple)

export const brand = {
  primary: '#745EE1',           // Main brand purple
  primaryLight: '#8B7AE8',      // Lighter purple
  primaryDark: '#5A48B8',       // Darker purple
  primaryMuted: '#F0EDFC',      // Very soft purple background
  secondary: '#6d6e87',         // Secondary gray-purple
  secondaryMuted: '#F5F5F7',    // Soft gray background
  accent: '#35ADF4',            // Info blue for accents
  accentMuted: '#EDF7FE',
};

export const semantic = {
  success: '#5BCC56',           // Green
  successLight: '#ECFDF5',      // Mint background
  successDark: '#157B10',
  danger: '#FF4351',            // Red
  dangerLight: '#FFF1F1',       // Blush background
  dangerDark: '#FF524E',
  warning: '#FFB800',           // Yellow
  warningLight: '#FFFBEB',      // Cream background
  info: '#35ADF4',              // Blue
  infoLight: '#EFF6FF',         // Ice background
};

// Vital-specific colors (healthcare-appropriate)
export const vitals = {
  bloodPressure: {
    primary: '#FF4351',
    gradient: ['#FF4351', '#FF6B6B'],
    background: '#FFF1F1',
  },
  bloodGlucose: {
    primary: '#35ADF4',
    gradient: ['#35ADF4', '#60C5FA'],
    background: '#EDF7FE',
  },
  weight: {
    primary: '#745EE1',
    gradient: ['#745EE1', '#8B7AE8'],
    background: '#F0EDFC',
  },
  oxygen: {
    primary: '#5BCC56',
    gradient: ['#5BCC56', '#7DD97A'],
    background: '#ECFDF5',
  },
  heartRate: {
    primary: '#FF4351',
    gradient: ['#FF4351', '#FF6B6B'],
    background: '#FFF1F1',
  },
};

export const neutral = {
  white: '#FFFFFF',
  gray50: '#FAFAFA',
  gray100: '#F5F5F7',
  gray200: '#EBEBEF',
  gray300: '#D1D1D6',
  gray400: '#A1A1AA',
  gray500: '#737380',
  gray600: '#52525E',
  gray700: '#3A3A45',
  gray800: '#27272E',
  gray900: '#18181B',
  black: '#0D0D0F',
};

export const Colors = {
  light: {
    // Text
    text: '#1F2937',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',

    // Backgrounds - soft purple tint like web
    background: '#F8F7FC',
    backgroundSecondary: '#F4F4F4',
    backgroundAccent: '#F0EDFC',

    // Surfaces
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',

    // Borders
    border: '#D7D7D7',
    borderLight: '#E5E7EB',
    divider: '#F3F4F6',

    // Interactive
    tint: brand.primary,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: brand.primary,

    // Shadows
    shadow: 'rgba(116, 94, 225, 0.08)',
    shadowMedium: 'rgba(116, 94, 225, 0.12)',
    shadowStrong: 'rgba(116, 94, 225, 0.16)',

    // Overlays
    overlay: 'rgba(31, 41, 55, 0.3)',
    overlayLight: 'rgba(31, 41, 55, 0.1)',

    // Spread semantic & brand
    ...semantic,
    ...brand,
  },
  dark: {
    // Text
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textTertiary: '#9CA3AF',

    // Backgrounds
    background: '#0a0a12',
    backgroundSecondary: '#0f0f1a',
    backgroundAccent: '#1A1A2E',

    // Surfaces
    surface: '#0f0f1a',
    surfaceElevated: '#1A1A2E',
    card: '#0f0f1a',
    cardElevated: '#1A1A2E',

    // Borders
    border: '#2d2d2f',
    borderLight: '#252530',
    divider: '#2d2d2f',

    // Interactive
    tint: brand.primaryLight,
    tabIconDefault: '#6B7280',
    tabIconSelected: brand.primaryLight,

    // Shadows
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowMedium: 'rgba(0, 0, 0, 0.4)',
    shadowStrong: 'rgba(0, 0, 0, 0.5)',

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.6)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',

    // Spread semantic & brand
    ...semantic,
    ...brand,
  },
};

export default Colors;
