import { ComponentProps, PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme";

export const APP_VERSION = "Version 1.2";

export function Screen({
  children,
  scroll = true
}: PropsWithChildren<{ scroll?: boolean }>) {
  const content = (
    <View style={styles.screenInner}>
      {children}
      <VersionFooter />
    </View>
  );
  if (!scroll) {
    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={12}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={12}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        alwaysBounceVertical
        showsVerticalScrollIndicator
      >
        {content}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function BrandLockup({
  compact = false,
  tone = "light"
}: {
  compact?: boolean;
  tone?: "light" | "dark";
}) {
  return (
    <Image
      source={require("../../assets/logo.png")}
      resizeMode="contain"
      style={[
        styles.brandLogo,
        compact ? styles.brandLogoCompact : styles.brandLogoFull,
        tone === "dark" && styles.brandLogoDark
      ]}
    />
  );
}

export function HeroCard({
  title,
  subtitle,
  logoOnly = false
}: {
  title?: string;
  subtitle?: string;
  logoOnly?: boolean;
}) {
  return (
    <LinearGradient colors={["#10233f", "#1859d1"]} style={[styles.hero, logoOnly && styles.heroLogoOnly]}>
      <BrandLockup />
      {!logoOnly && title ? <Text style={styles.heroTitle}>{title}</Text> : null}
      {!logoOnly && subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
    </LinearGradient>
  );
}

export function SectionCard({
  title,
  action,
  children
}: PropsWithChildren<{ title: string; action?: ReactNode }>) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

export function Label({ children }: PropsWithChildren) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Input(props: ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor="#8fa0b8"
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

export function Button({
  title,
  onPress,
  tone = "primary",
  size = "md",
  busy,
  disabled
}: {
  title: string;
  onPress: () => void;
  tone?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  busy?: boolean;
  disabled?: boolean;
}) {
  const isDisabled = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        size === "sm" && styles.buttonSmall,
        tone === "primary" && styles.buttonPrimary,
        tone === "secondary" && styles.buttonSecondary,
        tone === "ghost" && styles.buttonGhost,
        isDisabled && styles.buttonDisabled
      ]}
    >
      {busy ? (
        <ActivityIndicator color={tone === "ghost" ? theme.colors.primary : "#fff"} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            size === "sm" && styles.buttonTextSmall,
            tone === "secondary" && styles.buttonTextSecondary,
            tone === "ghost" && styles.buttonTextGhost
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function StatTile({
  label,
  value,
  accent
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View style={[styles.statTile, { borderLeftColor: accent }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function VersionFooter() {
  return (
    <View style={styles.footerWrap}>
      <Text style={styles.footerText}>{APP_VERSION}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40
  },
  screenInner: {
    padding: 20,
    gap: 18
  },
  brandLogo: {
    alignSelf: "center"
  },
  brandLogoFull: {
    width: 290,
    height: 92
  },
  brandLogoCompact: {
    width: 150,
    height: 46
  },
  brandLogoDark: {
    opacity: 0.98
  },
  hero: {
    borderRadius: theme.radius.lg,
    padding: 22,
    gap: 8
  },
  heroLogoOnly: {
    minHeight: 132,
    justifyContent: "center",
    alignItems: "center"
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800"
  },
  heroSubtitle: {
    color: "#dbe7ff",
    fontSize: 15,
    lineHeight: 22
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 14
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.ink
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.inkMuted
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#f9fbff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: theme.colors.ink
  },
  button: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  buttonSmall: {
    minHeight: 40,
    borderRadius: 14,
    paddingHorizontal: 14
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary
  },
  buttonSecondary: {
    backgroundColor: theme.colors.primarySoft
  },
  buttonGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  buttonDisabled: {
    opacity: 0.55
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  },
  buttonTextSmall: {
    fontSize: 14
  },
  buttonTextSecondary: {
    color: theme.colors.primary
  },
  buttonTextGhost: {
    color: theme.colors.primary
  },
  statTile: {
    flex: 1,
    backgroundColor: "#f8fbff",
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 5
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.inkMuted,
    marginBottom: 8
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.ink
  },
  emptyWrap: {
    paddingVertical: 10,
    gap: 6
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.ink
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.inkMuted
  },
  footerWrap: {
    alignItems: "center",
    paddingTop: 2,
    paddingBottom: 6
  },
  footerText: {
    color: theme.colors.inkMuted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3
  }
});
