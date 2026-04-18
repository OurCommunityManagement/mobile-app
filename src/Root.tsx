import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { useApp } from "./context/AppContext";
import { LoginScreen } from "./screens/LoginScreen";
import { ForgotPasswordScreen } from "./screens/ForgotPasswordScreen";
import { AdminScreen } from "./screens/AdminScreen";
import { OwnerScreen } from "./screens/OwnerScreen";
import { PlatformScreen } from "./screens/PlatformScreen";
import { theme } from "./theme";

export function Root() {
  const { booting, configured, session } = useApp();
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  if (booting) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Connecting to Supabase…</Text>
      </View>
    );
  }

  if (!configured) {
    return <LoginScreen onForgotPassword={() => setShowForgotPassword(true)} />;
  }

  if (!session) {
    return showForgotPassword ? (
      <ForgotPasswordScreen onBack={() => setShowForgotPassword(false)} />
    ) : (
      <LoginScreen onForgotPassword={() => setShowForgotPassword(true)} />
    );
  }

  if (session.role === "platform") {
    return <PlatformScreen />;
  }

  if (session.role === "admin") {
    return <AdminScreen />;
  }

  return <OwnerScreen />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: theme.colors.background,
    gap: 14
  },
  loadingText: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.inkMuted,
    textAlign: "center"
  }
});
