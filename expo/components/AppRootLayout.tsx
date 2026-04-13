import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { StatusBar } from "expo-status-bar";
import React, { ReactNode, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import AppErrorBoundary from "@/components/AppErrorBoundary";
import Colors from "@/constants/colors";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AppShell({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={styles.root}>
        <AppErrorBoundary>
          <View style={styles.root}>{children}</View>
        </AppErrorBoundary>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  );
}

export default function AppRootLayout() {
  useEffect(() => {
    console.log("[layout] booting root slot shell", { root: "deep-mine-root" });

    SystemUI.setBackgroundColorAsync(Colors.shell).catch((error: unknown) => {
      console.log("[layout] failed to set system background", error);
    });

    SplashScreen.hideAsync().catch((error: unknown) => {
      console.log("[layout] failed to hide splash screen", error);
    });
  }, []);

  return (
    <AppShell>
      <RootLayoutNav />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.shell,
  },
});
