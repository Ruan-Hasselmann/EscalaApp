export const lightColors = {
  background: "#F9FAFB",
  surface: "#FFFFFF",
  text: "#0F172A",
  textMuted: "#64748B",

  primary: "#2563EB",
  primaryContrast: "#FFFFFF",

  secondary: "#F59E0B",        // âmbar
  secondaryContrast: "#FFFFFF",

  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",

  border: "#E5E7EB",
};

export const darkColors = {
  background: "#0F172A",
  surface: "#020617",
  text: "#E5E7EB",
  textMuted: "#94A3B8",

  primary: "#3B82F6",
  primaryContrast: "#020617",

  secondary: "#FBBF24",        // âmbar mais claro
  secondaryContrast: "#020617",

  success: "#22C55E",
  warning: "#FBBF24",
  danger: "#EF4444",

  border: "#1E293B",
};

export type ThemeColors = typeof lightColors;
