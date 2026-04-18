import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useApp } from "../context/AppContext";
import { Button, HeroCard, Input, Label, Screen, SectionCard } from "../components/ui";
import { theme } from "../theme";

export function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const { requestPasswordReset, resetPassword } = useApp();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRequestOtp() {
    setBusy(true);
    const result = await requestPasswordReset(email);
    setBusy(false);

    if (!result.ok) {
      Alert.alert("Could not send OTP", result.message);
      return;
    }

    setGeneratedOtp(result.otp ?? null);
  }

  async function handleReset() {
    setBusy(true);
    const result = await resetPassword(otp, password, confirmPassword);
    setBusy(false);

    if (!result.ok) {
      Alert.alert("Reset failed", result.message);
      return;
    }

    Alert.alert("Password updated", "You can sign in with your new password now.");
    onBack();
  }

  return (
    <Screen>
      <HeroCard
        title="Reset password"
        subtitle="The current app uses an OTP preview flow, so this mobile version mirrors that behavior for platform, community, staff, and owner accounts."
      />

      <SectionCard title="Request OTP">
        <View style={styles.fieldWrap}>
          <Label>Registered email</Label>
          <Input
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="admin@community.com"
          />
        </View>
        <Button title="Generate OTP" onPress={() => void handleRequestOtp()} busy={busy} />
        {generatedOtp ? (
          <View style={styles.otpCard}>
            <Text style={styles.otpLabel}>Simulated OTP preview</Text>
            <Text style={styles.otpValue}>{generatedOtp}</Text>
            <Text style={styles.otpHint}>Use this only for development. In production, send it by email or SMS.</Text>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="Set a new password">
        <View style={styles.fieldWrap}>
          <Label>OTP</Label>
          <Input value={otp} onChangeText={setOtp} keyboardType="number-pad" placeholder="6-digit OTP" />
        </View>
        <View style={styles.fieldWrap}>
          <Label>New password</Label>
          <Input secureTextEntry value={password} onChangeText={setPassword} placeholder="Minimum 8 characters" />
        </View>
        <View style={styles.fieldWrap}>
          <Label>Confirm password</Label>
          <Input
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat new password"
          />
        </View>
        <Button title="Reset Password" onPress={() => void handleReset()} busy={busy} />
        <Button title="Back to Login" onPress={onBack} tone="ghost" />
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fieldWrap: {
    gap: 8
  },
  otpCard: {
    backgroundColor: "#fff8eb",
    borderRadius: 16,
    padding: 16,
    gap: 6
  },
  otpLabel: {
    color: theme.colors.inkMuted,
    fontSize: 13,
    fontWeight: "600"
  },
  otpValue: {
    color: theme.colors.danger,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 6
  },
  otpHint: {
    color: theme.colors.inkMuted,
    fontSize: 13,
    lineHeight: 18
  }
});
