import { darkTheme, lightTheme } from "@/theme";
import {
  createContext,
  useContext,
  useMemo,
  ReactNode,
} from "react";
import { useColorScheme } from "react-native";

/* =========================
   DOMAIN TYPES
========================= */

/**
 * REGRA DE UI:
 * - O tema segue EXCLUSIVAMENTE o tema do sistema
 * - Não há override manual (por enquanto)
 */

export type ThemeMode = "light" | "dark";
export type AppTheme = typeof lightTheme;

type ThemeContextType = {
  theme: AppTheme;
  mode: ThemeMode;
};

/* =========================
   CONTEXT
========================= */

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/* =========================
   PROVIDER
========================= */

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();

  const mode: ThemeMode =
    systemScheme === "dark" ? "dark" : "light";

  const theme = useMemo<AppTheme>(() => {
    return mode === "dark" ? darkTheme : lightTheme;
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ theme, mode }}>
      {children}
    </ThemeContext.Provider>
  );
}

/* =========================
   HOOK
========================= */

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);

  if (!ctx) {
    throw new Error(
      "useTheme must be used within a ThemeProvider"
    );
  }

  return ctx;
}
