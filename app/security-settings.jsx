
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

import {
  hasPin,
  getAppLockEnabled,
  setAppLockEnabled,
} from "../utils/pinStorage";

export default function SecuritySettings() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [pinExists, setPinExists] = useState(false);

  const [appLockEnabled, setAppLockEnabledState] =
    useState(false);

  const [savingLock, setSavingLock] = useState(false);

  // Reload PIN and App Lock settings whenever
  // this screen becomes active.
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

          const enabled = await getAppLockEnabled(
            user.uid
          );

          if (active) {
            setPinExists(exists);
            setAppLockEnabledState(enabled);
          }
        } catch (error) {
          console.error(
            "Security settings load error:",
            error
          );

          if (active) {
            Alert.alert(
              "Error",
              "Unable to load security settings."
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      loadPinStatus();

      return () => {
        active = false;
      };
    }, [user?.uid])
  );

  // Handle the App Lock switch.
  async function handleAppLockToggle(enabled) {
    if (!user?.uid || savingLock) return;

    if (!pinExists) {
      Alert.alert(
        "PIN Required",
        "Please set up a PIN before enabling App Lock."
      );
      return;
    }

    // Turning OFF requires PIN verification.
    if (!enabled) {
      router.push({
        pathname: "/pin-manage",
        params: {
          action: "disable-lock",
        },
      });

      return;
    }

    // Turning ON uses the existing PIN.
    try {
      setSavingLock(true);

      await setAppLockEnabled(user.uid, true);

      setAppLockEnabledState(true);

      // Tell PinGate that the setting changed.
      DeviceEventEmitter.emit(
        "taskpilot-app-lock-changed",
        user.uid
      );
    } catch (error) {
      console.error(
        "Enable App Lock error:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to enable App Lock."
      );
    } finally {
      setSavingLock(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={styles.screen}
        edges={["top", "bottom"]}
      >
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#456B4A"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top", "bottom"]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* BACK BUTTON */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#1B3A1A"
          />
        </TouchableOpacity>

        {/* HEADER */}
        <Text style={styles.title}>
          Security & Privacy
        </Text>

        <Text style={styles.subtitle}>
          Manage your TaskPilot PIN and app security.
        </Text>

        {/* PIN PROTECTION */}
        <View style={styles.card}>
          <Text style={styles.label}>
            PIN Protection
          </Text>

          <Text style={styles.description}>
            {pinExists
              ? "A PIN is configured for this account on this device."
              : "No PIN has been configured for this account."}
          </Text>

          {!pinExists ? (
            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.8}
              onPress={() =>
                router.push("/pin-setup")
              }
            >
              <Text style={styles.buttonText}>
                Set Up PIN
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              {/* CHANGE PIN */}
              <TouchableOpacity
                style={styles.button}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: "/pin-manage",
                    params: {
                      action: "change",
                    },
                  })
                }
              >
                <Text style={styles.buttonText}>
                  Change PIN
                </Text>
              </TouchableOpacity>

              {/* REMOVE PIN */}
              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: "/pin-manage",
                    params: {
                      action: "remove",
                    },
                  })
                }
              >
                <Text style={styles.secondaryText}>
                  Remove PIN
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* APP LOCK */}
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchContent}>
              <Text style={styles.label}>
                App Lock
              </Text>

              <Text style={styles.description}>
                Require a PIN when reopening TaskPilot.
              </Text>
            </View>

            <Switch
              value={appLockEnabled}
              disabled={
                !pinExists || savingLock
              }
              onValueChange={
                handleAppLockToggle
              }
              trackColor={{
                false: "#D0D5D0",
                true: "#A8CBA0",
              }}
              thumbColor="#456B4A"
            />
          </View>

          <Text style={styles.hint}>
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
  screen: {
    flex: 1,
    backgroundColor: "#F0F0F0",
  },

  scrollView: {
    flex: 1,
  },

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
    borderColor: "#A8CBA0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 25,
    fontWeight: "800",
    color: "#1B3A1A",
  },

  subtitle: {
    fontSize: 14,
    color: "#647067",
    marginTop: 8,
    marginBottom: 25,
  },

  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#DFE6DF",
  },

  label: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1B3A1A",
  },

  description: {
    fontSize: 13,
    color: "#647067",
    marginTop: 6,
    lineHeight: 19,
  },

  button: {
    backgroundColor: "#456B4A",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  secondaryButton: {
    padding: 15,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#B42318",
    borderRadius: 12,
  },

  secondaryText: {
    color: "#B42318",
    fontWeight: "700",
  },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  switchContent: {
    flex: 1,
  },

  hint: {
    color: "#647067",
    fontSize: 12,
    marginTop: 14,
    lineHeight: 18,
  },
});
