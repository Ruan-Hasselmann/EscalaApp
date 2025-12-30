import { AppTheme, darkTheme, lightTheme } from "@/theme";
import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";


type ThemeMode = "light" | "dark";

type ThemeContextType = {
  mode: ThemeMode;
  theme: AppTheme;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null

  const [mode, setMode] = useState<ThemeMode>(
    systemScheme === "dark" ? "dark" : "light"
  );

  const theme = useMemo<AppTheme>(() => {
    return mode === "dark" ? darkTheme : lightTheme;
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, theme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
