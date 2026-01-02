import { darkColors, lightColors, ThemeColors } from "./colors";
import { spacing } from "./spacing";
import { typography } from "./typography";

export type AppTheme = {
  colors: ThemeColors;
  spacing: typeof spacing;
  typography: typeof typography;
};

export const lightTheme: AppTheme = {
  colors: lightColors,
  spacing,
  typography,
};

export const darkTheme: AppTheme = {
  colors: darkColors,
  spacing,
  typography,
};
