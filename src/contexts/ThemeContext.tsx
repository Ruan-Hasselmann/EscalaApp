import { darkTheme, lightTheme } from "@/theme";
import { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";

type ThemeMode = "light" | "dark";

type ThemeContextType = {
  theme: any;
  mode: ThemeMode;
};

const ThemeContext = createContext({} as ThemeContextType);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 👈 ESCUTA O SISTEMA

  const mode: ThemeMode = systemScheme === "dark" ? "dark" : "light";

  const theme = useMemo(() => {
    return mode === "dark" ? darkTheme : lightTheme;
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ theme, mode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
