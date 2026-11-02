
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../hooks/useAuth";
import { useAppTheme } from "../contexts/ThemeContext";
import { hasPin, savePin } from "../utils/pinStorage";
import PinKeypad from "../components/PinKeypad";

export default function PinSetupScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [step, setStep] = useState("create");
  const [busy, setBusy] = useState(false);
  const [keypadVersion, setKeypadVersion] = useState(0);

  const firstPin = useRef(null);
  const submitting = useRef(false);

  const handleComplete = async (pin) => {
    if (submitting.current) return;

    if (step === "create") {
      firstPin.current = pin;
      setStep("confirm");
      setKeypadVersion((value) => value + 1);
      return;
    }

    if (pin !== firstPin.current) {
      firstPin.current = null;
      setStep("create");
      setKeypadVersion((value) => value + 1);

      Alert.alert(
        "PINs do not match",
        "Please create your PIN again."
      );
      return;
    }

    if (!user?.uid) {
      Alert.alert(
        "Session expired",
        "Please sign in again."
      );
      return;
    }

    submitting.current = true;
    setBusy(true);

    try {
      if (await hasPin(user.uid)) {
        Alert.alert(
          "PIN already exists",
          "Your PIN is already configured."
        );
        return;
      }

      await savePin(user.uid, pin);

      Alert.alert(
        "PIN created",
        "Your PIN has been saved on this device.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error("PIN setup error:", error);
      Alert.alert(
        "Unable to save PIN",
        "Please try again."
      );
    } finally {
      firstPin.current = null;
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <Pressable
        style={[
          styles.backButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={() => router.back()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons
          name="arrow-back"
          size={24}
          color={isDark ? colors.text : "#1B3A1A"}
        />
      </Pressable>

      <View style={styles.content}>
        <PinKeypad
          key={keypadVersion}
          title={
            step === "create"
              ? "Create your PIN"
              : "Confirm your PIN"
          }
          subtitle={
            step === "create"
              ? "Choose a 4-digit PIN to protect TaskPilot."
              : "Enter the same PIN one more time."
          }
          pinLength={4}
          disabled={busy}
          onComplete={handleComplete}
        />

        {busy && (
          <ActivityIndicator
            color={colors.primary}
            style={styles.loading}
          />
        )}

        <Text
          style={[
            styles.footer,
            { color: colors.secondaryText },
          ]}
        >
          {step === "create"
            ? "Keep your PIN private and memorable."
            : "Your PINs must match to continue."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: "absolute",
    top: 55,
    left: 24,
    zIndex: 2,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 35,
  },
  loading: {
    marginTop: 16,
  },
  footer: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 24,
    paddingHorizontal: 24,
  },
});
