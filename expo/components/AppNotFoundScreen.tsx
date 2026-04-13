import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

export default function AppNotFoundScreen() {
  return (
    <LinearGradient
      colors={[Colors.backgroundTop, Colors.backgroundMid, Colors.backgroundBottom]}
      style={styles.background}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.card} testID="not-found-card">
          <Text style={styles.kicker}>Verlorener Stollen</Text>
          <Text style={styles.title}>Hier endet die Karte.</Text>
          <Text style={styles.description}>
            Dieser Weg führt zu keinem Spielscreen. Spring zurück und fahr wieder in den Schacht.
          </Text>
          <Link href="/" asChild>
            <Pressable style={styles.button} testID="not-found-home-button">
              <Text style={styles.buttonText}>Zur Mine</Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.outlineStrong,
    backgroundColor: Colors.cardSoft,
    padding: 24,
    gap: 12,
  },
  kicker: {
    color: Colors.copper,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  description: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: Colors.teal,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: Colors.shell,
    fontSize: 15,
    fontWeight: "800",
  },
});
