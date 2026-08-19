import { PropsWithChildren, ReactNode } from "react";
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BrandLockup, VersionFooter } from "./ui";
import { theme } from "../theme";

type NavItem<T extends string> = {
  key: T;
  label: string;
};

export function RoleShell<T extends string>({
  title,
  subtitle,
  accentColors,
  navItems,
  activeTab,
  onSelectTab,
  actions,
  children
}: PropsWithChildren<{
  title: string;
  subtitle: string;
  accentColors: [string, string];
  navItems: NavItem<T>[];
  activeTab: T;
  onSelectTab: (tab: T) => void;
  actions?: ReactNode;
}>) {
  const { width } = useWindowDimensions();
  const compactHero = width < 420;
  const topInset = Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 8 : 6;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: topInset }]}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      alwaysBounceVertical
      showsVerticalScrollIndicator
    >
      <LinearGradient colors={accentColors} style={[styles.hero, compactHero && styles.heroCompact]}>
        <View style={[styles.heroTop, compactHero && styles.heroTopCompact]}>
          <BrandLockup compact />
          <View style={[styles.heroActions, compactHero && styles.heroActionsCompact]}>{actions}</View>
        </View>
        <Text style={[styles.heroTitle, compactHero && styles.heroTitleCompact]}>{title}</Text>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
      </LinearGradient>

      <View style={styles.navCard}>
        <Text style={styles.navLabel}>Navigate</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.navRow}
          keyboardShouldPersistTaps="handled"
        >
          {navItems.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => onSelectTab(item.key)}
              style={[styles.navPill, activeTab === item.key && styles.navPillActive]}
            >
              <Text style={[styles.navPillText, activeTab === item.key && styles.navPillTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.body}>{children}</View>
      <VersionFooter />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
    gap: 18
  },
  hero: {
    borderRadius: 28,
    padding: 22,
    gap: 10
  },
  heroCompact: {
    padding: 18
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  heroTopCompact: {
    alignItems: "flex-start",
    flexWrap: "wrap"
  },
  heroActions: {
    flexShrink: 0
  },
  heroActionsCompact: {
    width: "100%",
    alignItems: "flex-end"
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800"
  },
  heroTitleCompact: {
    fontSize: 24,
    lineHeight: 30
  },
  heroSubtitle: {
    color: "#e8efff",
    fontSize: 15,
    lineHeight: 22
  },
  navCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 12
  },
  navLabel: {
    color: theme.colors.inkMuted,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  navRow: {
    flexDirection: "row",
    gap: 10
  },
  navPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#f8fbff",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  navPillActive: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink
  },
  navPillText: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: "700"
  },
  navPillTextActive: {
    color: "#fff"
  },
  body: {
    gap: 18
  }
});
