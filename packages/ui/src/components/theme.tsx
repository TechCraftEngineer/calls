"use client";

import * as React from "react";

export type ThemeMode = "light";
export type ResolvedTheme = "light";

const LIGHT_VALUE = {
  themeMode: "light" as ThemeMode,
  resolvedTheme: "light" as ResolvedTheme,
  setTheme: () => {},
  toggleMode: () => {},
};

export const ThemeContext = React.createContext<typeof LIGHT_VALUE>(LIGHT_VALUE);

export function useTheme() {
  return React.useContext(ThemeContext);
}
