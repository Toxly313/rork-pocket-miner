import React, { ErrorInfo, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export default class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  public state: AppErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  public static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    console.error("[error-boundary] render crash", error);

    return {
      hasError: true,
      message: error.message || "Unbekannter Fehler im Schacht.",
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[error-boundary] componentDidCatch", error, errorInfo.componentStack);
  }

  private handleReset = (): void => {
    console.log("[error-boundary] reset requested");
    this.setState({ hasError: false, message: "" });
  };

  public render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container} testID="error-boundary">
        <View style={styles.card}>
          <Text style={styles.title}>Der Schacht ist eingebrochen</Text>
          <Text style={styles.message}>
            {this.state.message || "Beim Laden des Spiels ist ein Fehler passiert."}
          </Text>
          <Pressable style={styles.button} onPress={this.handleReset} testID="error-reset-button">
            <Text style={styles.buttonText}>Neu starten</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.shell,
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.outlineStrong,
    backgroundColor: Colors.cardSoft,
    padding: 24,
    gap: 12,
  },
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  message: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: Colors.copper,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: Colors.shell,
    fontSize: 15,
    fontWeight: "800",
  },
});
