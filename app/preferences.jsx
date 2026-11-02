import React from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "../contexts/ThemeContext";

const OPTIONS = [
  { value: "light", title: "Light Mode", detail: "Use TaskPilot's light appearance", icon: "sunny-outline" },
  { value: "dark", title: "Dark Mode", detail: "Use TaskPilot's dark appearance", icon: "moon-outline" },
  { value: "system", title: "System Default", detail: "Follow your device appearance", icon: "phone-portrait-outline" },
];

export default function Preferences() {
  const router = useRouter();
  const { colors, isDark, themePreference, themeLoading, changeTheme } = useAppTheme();

  async function selectTheme(value) {
    try { await changeTheme(value); }
    catch { Alert.alert("Unable to Save", "Could not save your theme preference."); }
  }

  if (themeLoading) {
    return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}><ActivityIndicator style={{ flex: 1 }} color={colors.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityLabel="Back" onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.surface }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Preferences</Text>
            <Text style={[styles.subtitle, { color: colors.secondaryText }]}>Customize your TaskPilot experience.</Text>
          </View>
        </View>
        <Text style={[styles.section, { color: colors.text }]}>Appearance</Text>
        {OPTIONS.map(option => {
          const selected = themePreference === option.value;
          return (
            <TouchableOpacity key={option.value} onPress={() => selectTheme(option.value)} activeOpacity={0.75}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border }]}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? "#354638" : "#F0F0F0" }]}>
                <Ionicons name={option.icon} size={21} color={colors.primary} />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{option.title}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>{option.detail}</Text>
              </View>
              <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={22} color={colors.primary} />
            </TouchableOpacity>
          );
        })}
        <Text style={[styles.note, { color: colors.secondaryText }]}>Your choice is saved on this device. Screens with theme-aware styling will update automatically.</Text>
        <Text style={[styles.section, { color: colors.text }]}>Notifications</Text>
        <TouchableOpacity onPress={() => Linking.openSettings().catch(() => Alert.alert("Unavailable", "Open your device settings manually."))}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconBox, { backgroundColor: isDark ? "#354638" : "#F0F0F0" }]}>
            <Ionicons name="notifications-outline" size={21} color={colors.primary} />
          </View>
          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Device Notification Settings</Text>
            <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>Manage TaskPilot notification permissions</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
        </TouchableOpacity>
        <Text style={[styles.note, { color: colors.secondaryText }]}>Task reminder schedules are managed separately by TaskPilot.</Text>
        <Text style={[styles.version, { color: colors.secondaryText }]}>TaskPilot v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 28 },
  back: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "800" }, subtitle: { marginTop: 4, fontSize: 12 },
  section: { fontSize: 15, fontWeight: "800", marginBottom: 12, marginTop: 10 },
  card: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 17, padding: 15, marginBottom: 10 },
  iconBox: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardText: { flex: 1, marginLeft: 12, marginRight: 8 },
  cardTitle: { fontSize: 14, fontWeight: "700" }, cardSubtitle: { fontSize: 11, marginTop: 4, lineHeight: 16 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 22 },
  version: { marginTop: 24, textAlign: "center", fontSize: 11 },
});
