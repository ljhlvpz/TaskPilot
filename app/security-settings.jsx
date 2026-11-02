
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";

import { useAuth } from "../hooks/useAuth";
import { useAppTheme } from "../contexts/ThemeContext";
import {
  hasPin,
  getAppLockEnabled,
  setAppLockEnabled,
} from "../utils/pinStorage";

export default function SecuritySettings() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [pinExists, setPinExists] = useState(false);
  const [appLockEnabled, setAppLockEnabledState] = useState(false);
  const [savingLock, setSavingLock] = useState(false);

  const muted = colors.secondaryText;
  const heading = isDark ? colors.text : "#1B3A1A";
  const cardBorder = isDark ? colors.border : "#DFE6DF";
  const buttonBackground = isDark ? "#A8CBA0" : "#456B4A";
  const buttonForeground = isDark ? "#17251A" : "#FFFFFF";
  const danger = isDark ? "#FF8C85" : "#B42318";

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadPinStatus() {
        if (!user?.uid) {
          if (active) {
            setPinExists(false);
            setAppLockEnabledState(false);
            setLoading(false);
          }
          return;
        }

        try {
          setLoading(true);

          const exists = await hasPin(user.uid);
          const enabled = await getAppLockEnabled(user.uid);

          if (active) {
            setPinExists(exists);
            setAppLockEnabledState(enabled);
          }
        } catch (error) {
          console.error("Security settings load error:", error);
          if (active) {
            Alert.alert(
              "Error",
              "Unable to load security settings."
            );
          }
        } finally {
          if (active) setLoading(false);
        }
      }

      loadPinStatus();

      return () => {
        active = false;
      };
    }, [user?.uid])
  );

  async function handleAppLockToggle(enabled) {
    if (!user?.uid || savingLock) return;

    if (!pinExists) {
      Alert.alert(
        "PIN Required",
        "Please set up a PIN before enabling App Lock."
      );
      return;
    }

    if (!enabled) {
      router.push({
        pathname: "/pin-manage",
        params: { action: "disable-lock" },
      });
      return;
    }

    try {
      setSavingLock(true);
      await setAppLockEnabled(user.uid, true);
      setAppLockEnabledState(true);

      DeviceEventEmitter.emit(
        "taskpilot-app-lock-changed",
        user.uid
      );
    } catch (error) {
      console.error("Enable App Lock error:", error);
      Alert.alert("Error", "Unable to enable App Lock.");
    } finally {
      setSavingLock(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.screen,
          { backgroundColor: colors.background },
        ]}
        edges={["top", "bottom"]}
      >
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.screen,
        { backgroundColor: colors.background },
      ]}
      edges={["top", "bottom"]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={heading}
          />
        </TouchableOpacity>

        <Text style={[styles.title, { color: heading }]}>
          Security & Privacy
        </Text>

        <Text style={[styles.subtitle, { color: muted }]}>
          Manage your TaskPilot PIN and app security.
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: cardBorder,
            },
          ]}
        >
          <Text style={[styles.label, { color: heading }]}>
            PIN Protection
          </Text>

          <Text style={[styles.description, { color: muted }]}>
            {pinExists
              ? "A PIN is configured for this account on this device."
              : "No PIN has been configured for this account."}
          </Text>

          {!pinExists ? (
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: buttonBackground },
              ]}
              activeOpacity={0.8}
              onPress={() => router.push("/pin-setup")}
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: buttonForeground },
                ]}
              >
                Set Up PIN
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: buttonBackground },
                ]}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: "/pin-manage",
                    params: { action: "change" },
                  })
                }
              >
                <Text
                  style={[
                    styles.buttonText,
                    { color: buttonForeground },
                  ]}
                >
                  Change PIN
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { borderColor: danger },
                ]}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: "/pin-manage",
                    params: { action: "remove" },
                  })
                }
              >
                <Text
                  style={[
                    styles.secondaryText,
                    { color: danger },
                  ]}
                >
                  Remove PIN
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: cardBorder,
            },
          ]}
        >
          <View style={styles.switchRow}>
            <View style={styles.switchContent}>
              <Text style={[styles.label, { color: heading }]}>
                App Lock
              </Text>

              <Text
                style={[
                  styles.description,
                  { color: muted },
                ]}
              >
                Require a PIN when reopening TaskPilot.
              </Text>
            </View>

            <Switch
              value={appLockEnabled}
              disabled={!pinExists || savingLock}
              onValueChange={handleAppLockToggle}
              trackColor={{
                false: isDark ? "#526055" : "#D0D5D0",
                true: "#A8CBA0",
              }}
              thumbColor={
                appLockEnabled ? "#456B4A" : "#E9EDE9"
              }
            />
          </View>

          <Text style={[styles.hint, { color: muted }]}>
            {pinExists
              ? "Turning off App Lock requires your current PIN."
              : "Set up a PIN to use App Lock."}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 25,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 25,
  },
  card: {
    padding: 18,
    borderRadius: 18,
    marginBottom: 18,
    borderWidth: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "800",
  },
  description: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
  },
  button: {
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    fontWeight: "800",
  },
  secondaryButton: {
    padding: 15,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
  },
  secondaryText: {
    fontWeight: "700",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  switchContent: { flex: 1 },
  hint: {
    fontSize: 12,
    marginTop: 14,
    lineHeight: 18,
  },
});
