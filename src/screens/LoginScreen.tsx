import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useApp } from "../context/AppContext";
import { Button, HeroCard, Input, Label, Screen, SectionCard } from "../components/ui";
import { theme } from "../theme";

export function LoginScreen({ onForgotPassword }: { onForgotPassword: () => void }) {
  const {
    login,
    configured,
    pendingPlatformAuth,
    pendingCommunityAuth,
    verifyPlatformTotp,
    cancelPlatformTotp,
    verifyCommunityTotp,
    cancelCommunityTotp
  } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [busy, setBusy] = useState(false);
  const pendingTotp = pendingPlatformAuth || pendingCommunityAuth;

  async function handleLogin() {
    setBusy(true);
    const result = await login(email, password);
    setBusy(false);

    if (!result.ok) {
      Alert.alert("Sign in failed", result.message);
    }
  }

  async function handleTotpVerify() {
    setBusy(true);
    const result = await verifyPlatformTotp(totpCode);
    setBusy(false);

    if (!result.ok) {
      Alert.alert("Verification failed", result.message);
      return;
    }

    setTotpCode("");
  }

  async function handleCommunityTotpVerify() {
    setBusy(true);
    const result = await verifyCommunityTotp(totpCode);
    setBusy(false);

    if (!result.ok) {
      Alert.alert("Verification failed", result.message);
      return;
    }

    setTotpCode("");
  }

  function handleSubmit() {
    if (pendingPlatformAuth) {
      return void handleTotpVerify();
    }
    if (pendingCommunityAuth) {
      return void handleCommunityTotpVerify();
    }
    return void handleLogin();
  }

  return (
    <Screen>
      <HeroCard logoOnly />

      <SectionCard title="Sign in">
        {!configured ? (
          <Text style={styles.warning}>
            Add your Supabase keys to `.env` before running the mobile app.
          </Text>
        ) : null}
        <Text style={styles.helper}>
          Use the same account credentials stored in Supabase for your platform, community, staff, or owner role.
        </Text>
        <View style={styles.fieldWrap}>
          <Label>Email address</Label>
          <Input
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="owner@email.com"
          />
        </View>
        <View style={styles.fieldWrap}>
          <Label>Password</Label>
          <Input
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
          />
        </View>
        {pendingTotp ? (
          <>
            <Text style={styles.helper}>
              {pendingTotp.totpSetupRequired
                ? "Add this secret to your authenticator app, then enter the 6-digit code to finish sign-in."
                : "Enter the 6-digit code from your authenticator app to finish sign-in."}
            </Text>
            {pendingTotp.totpSetupRequired && pendingTotp.setupSecret ? (
              <View style={styles.secretWrap}>
                <Label>Authenticator secret</Label>
                <Text style={styles.secretValue}>{pendingTotp.setupSecret}</Text>
              </View>
            ) : null}
            <View style={styles.fieldWrap}>
              <Label>Authenticator code</Label>
              <Input
                keyboardType="number-pad"
                value={totpCode}
                onChangeText={setTotpCode}
                placeholder="123456"
              />
            </View>
          </>
        ) : null}
        <Button
          title={pendingTotp ? "Verify Sign-In" : "Sign In"}
          onPress={handleSubmit}
          busy={busy}
          disabled={!configured}
        />
        {pendingTotp ? (
          <Button
            title="Back to Sign In"
            onPress={pendingPlatformAuth ? cancelPlatformTotp : cancelCommunityTotp}
            tone="ghost"
          />
        ) : (
          <Pressable onPress={onForgotPassword}>
            <Text style={styles.link}>Forgot your password?</Text>
          </Pressable>
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fieldWrap: {
    gap: 8
  },
  warning: {
    color: theme.colors.warning,
    fontSize: 14,
    lineHeight: 20
  },
  helper: {
    color: theme.colors.inkMuted,
    fontSize: 14,
    lineHeight: 20
  },
  link: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center"
  },
  secretWrap: {
    gap: 8
  },
  secretValue: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1.2
  }
});
