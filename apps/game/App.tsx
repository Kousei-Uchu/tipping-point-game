import React from "react";
import { Fredoka_600SemiBold } from "@expo-google-fonts/fredoka";
import { Nunito_400Regular, Nunito_700Bold } from "@expo-google-fonts/nunito";
import { SpecialElite_400Regular } from "@expo-google-fonts/special-elite";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavProvider, useNav } from "./src/app/NavProvider";
import { SessionProvider } from "./src/app/SessionProvider";
import { SettingsProvider, useSettings } from "./src/app/SettingsProvider";
import { GameScreen } from "./src/screens/GameScreen";
import { RulebookScreen } from "./src/screens/RulebookScreen";
import { LobbyScreen } from "./src/screens/LobbyScreen";
import { ResultScreen } from "./src/screens/ResultScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { TitleScreen } from "./src/screens/TitleScreen";
import { fontState } from "./src/theme/tokens";

function Router() {
  const { route } = useNav();
  const { ready } = useSettings();
  const [fontsLoaded, fontError] = useFonts({ Fredoka_600SemiBold, Nunito_400Regular, Nunito_700Bold, SpecialElite_400Regular });
  // If a font fails to load the game still starts, in the system face.
  if (fontError) fontState.custom = false;
  if (!ready || (!fontsLoaded && !fontError)) return null; // settings and fonts load in a few ms; avoids a flash of the wrong type
  switch (route) {
    case "lobby": return <LobbyScreen />;
    case "game": return <GameScreen />;
    case "result": return <ResultScreen />;
    case "settings": return <SettingsScreen />;
    case "rules": return <RulebookScreen />;
    default: return <TitleScreen />;
  }
}

/** Providers wrap a tiny router. Nothing here is web-specific, so the same root runs on iOS and Android. */
export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <SessionProvider>
          <NavProvider>
            <StatusBar style="dark" />
            <Router />
          </NavProvider>
        </SessionProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
