
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../contexts/ThemeContext";

export default function PinKeypad({
  title = "Enter your PIN",
  subtitle = "",
  pinLength = 4,
  onComplete,
  disabled = false,
}) {
  const { colors, isDark } = useAppTheme();
  const [pin, setPin] = useState("");

  const palette = {
    title: isDark ? "#E8F2E5" : "#1B3A1A",
    subtitle: isDark ? "#A8BDA9" : "#667765",

    lockBackground: isDark ? "#304C36" : "#A8CBA0",
    lockIcon: isDark ? "#C8E5BF" : "#1B3A1A",

    keyBackground: isDark ? "#263C2D" : "#FFFFFF",
    keyBorder: isDark ? "#49664F" : "#DFE8DB",
    keyText: isDark ? "#E5F2DF" : "#1B3A1A",

    pressedBackground: isDark ? "#456B4A" : "#A8CBA0",

    emptyDot: isDark ? "#A8CBA0" : "#1B3A1A",
    filledDot: isDark ? "#B8DDB0" : "#1B3A1A",
  };

  const handleNumber = (number) => {
    if (disabled || pin.length >= pinLength) return;

    const nextPin = pin + number;
    setPin(nextPin);

    if (nextPin.length === pinLength) {
      setPin("");
      onComplete?.(nextPin);
    }
  };

  const handleDelete = () => {
    if (disabled) return;

    setPin((current) => current.slice(0, -1));
  };

  const keys = [
    "1", "2", "3",
    "4", "5", "6",
    "7", "8", "9",
    "", "0", "delete",
  ];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.lockCircle,
          {
            backgroundColor: palette.lockBackground,
          },
        ]}
      >
        <Ionicons
          name="lock-closed-outline"
          size={32}
          color={palette.lockIcon}
        />
      </View>

      <Text
        style={[
          styles.title,
          { color: palette.title },
        ]}
      >
        {title}
      </Text>

      {!!subtitle && (
        <Text
          style={[
            styles.subtitle,
            { color: palette.subtitle },
          ]}
        >
          {subtitle}
        </Text>
      )}

      <View style={styles.dots}>
        {Array.from({ length: pinLength }).map(
          (_, index) => {
            const filled = index < pin.length;

            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    borderColor: palette.emptyDot,
                    backgroundColor: filled
                      ? palette.filledDot
                      : "transparent",
                  },
                ]}
              />
            );
          }
        )}
      </View>

      <View style={styles.keypad}>
        {keys.map((key, index) => (
          <View
            key={index}
            style={styles.keySlot}
          >
            {key !== "" && (
              <Pressable
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={
                  key === "delete"
                    ? "Delete last PIN digit"
                    : `Digit ${key}`
                }
                onPress={() =>
                  key === "delete"
                    ? handleDelete()
                    : handleNumber(key)
                }
                style={({ pressed }) => [
                  styles.key,
                  {
                    backgroundColor: pressed
                      ? palette.pressedBackground
                      : palette.keyBackground,
                    borderColor: palette.keyBorder,
                    opacity: disabled ? 0.55 : 1,
                  },
                ]}
              >
                {key === "delete" ? (
                  <Ionicons
                    name="backspace-outline"
                    size={25}
                    color={palette.keyText}
                  />
                ) : (
                  <Text
                    style={[
                      styles.keyText,
                      { color: palette.keyText },
                    ]}
                  >
                    {key}
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  lockCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
  },

  dots: {
    flexDirection: "row",
    gap: 15,
    marginTop: 28,
    marginBottom: 32,
  },

  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },

  keypad: {
    width: 264,
    flexDirection: "row",
    flexWrap: "wrap",
  },

  keySlot: {
    width: "33.333%",
    height: 78,
    alignItems: "center",
    justifyContent: "center",
  },

  key: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  keyText: {
    fontSize: 25,
    fontWeight: "600",
  },
});
