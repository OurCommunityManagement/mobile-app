import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useApp } from "../context/AppContext";
import { Button, EmptyState, HeroCard, Input, Label, Screen, SectionCard, StatTile } from "../components/ui";
import { theme } from "../theme";

export function PlatformScreen() {
  const { communities, createCommunity, enterCommunity, logout, refresh, refreshing } = useApp();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    address: "",
    adminEmail: ""
  });
  const [saving, setSaving] = useState(false);

  async function handleCreateCommunity() {
    setSaving(true);
    const result = await createCommunity(form);
    setSaving(false);

    if (!result.ok) {
      Alert.alert("Could not create community", result.message);
      return;
    }

    setForm({
      name: "",
      slug: "",
      address: "",
      adminEmail: ""
    });
    Alert.alert("Community created", "The community was added and is ready for admin setup.");
  }

  return (
    <Screen>
      <HeroCard
        title="Platform dashboard"
        subtitle="Browse all communities from the mobile app and jump into the admin portal for any one of them."
      />

      <SectionCard
        title="Platform actions"
        action={<Button title="Logout" onPress={() => void logout()} tone="ghost" />}
      >
        <View style={styles.statsRow}>
          <StatTile label="Communities" value={String(communities.length)} accent={theme.colors.primary} />
          <StatTile label="Ready on iOS" value="Yes" accent={theme.colors.accent} />
        </View>
      </SectionCard>

      <SectionCard title="Create community">
        <Text style={styles.helper}>
          Add a new community from mobile, then jump straight into its admin workspace.
        </Text>
        <View style={styles.fieldWrap}>
          <Label>Community name</Label>
          <Input value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} placeholder="Green Meadows" />
        </View>
        <View style={styles.fieldWrap}>
          <Label>Slug</Label>
          <Input
            autoCapitalize="none"
            value={form.slug}
            onChangeText={(slug) => setForm((current) => ({ ...current, slug: slug.replace(/\s+/g, "-") }))}
            placeholder="green-meadows"
          />
        </View>
        <View style={styles.fieldWrap}>
          <Label>Address</Label>
          <Input value={form.address} onChangeText={(address) => setForm((current) => ({ ...current, address }))} placeholder="Community address" />
        </View>
        <View style={styles.fieldWrap}>
          <Label>Admin email</Label>
          <Input
            autoCapitalize="none"
            keyboardType="email-address"
            value={form.adminEmail}
            onChangeText={(adminEmail) => setForm((current) => ({ ...current, adminEmail }))}
            placeholder="admin@community.com"
          />
        </View>
        <Button title="Create Community" onPress={() => void handleCreateCommunity()} busy={saving} />
      </SectionCard>

      <SectionCard title="Communities">
        {!communities.length ? (
          <EmptyState
            title="No communities yet"
            body="Create the first community from the existing web portal or extend this mobile app with create/edit flows next."
          />
        ) : (
          <View style={styles.list}>
            {communities.map((community) => (
              <View key={community.id} style={styles.communityCard}>
                <Text style={styles.communityName}>{community.name}</Text>
                <Text style={styles.communityAddress}>{community.address || "No address set"}</Text>
                <Text style={styles.communityMeta}>{community.adminEmail}</Text>
                <Button title="Enter Community" onPress={() => void enterCommunity(community)} />
              </View>
            ))}
          </View>
        )}
        <Button title="Refresh" onPress={() => void refresh()} tone="secondary" busy={refreshing} />
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    gap: 12
  },
  fieldWrap: {
    gap: 8
  },
  helper: {
    color: theme.colors.inkMuted,
    lineHeight: 20
  },
  list: {
    gap: 12
  },
  communityCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    backgroundColor: "#f9fbff"
  },
  communityName: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.ink
  },
  communityAddress: {
    color: theme.colors.inkMuted,
    lineHeight: 20
  },
  communityMeta: {
    color: theme.colors.primary,
    fontWeight: "600"
  }
});
