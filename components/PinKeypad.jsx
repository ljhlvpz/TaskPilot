import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const GREEN = "#1B3A1A";
const LIGHT_GREEN = "#A8CBA0";

export default function PinKeypad({
  title = "Enter your PIN",
  subtitle = "",
  pinLength = 4,
  onComplete,
  disabled = false,
}) {
  const [pin, setPin] = useState("");

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
      <View style={styles.lockCircle}>
        <Ionicons
          name="lock-closed-outline"
          size={32}
          color={GREEN}
        />
      </View>

      <Text style={styles.title}>{title}</Text>

      {!!subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}

      <View style={styles.dots}>
        {Array.from({ length: pinLength }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index < pin.length && styles.filledDot,
            ]}
          />
        ))}
      </View>

      <View style={styles.keypad}>
        {keys.map((key, index) => (
          <View key={index} style={styles.keySlot}>
            {key !== "" && (
              <Pressable
                disabled={disabled}
                onPress={() =>
                  key === "delete"
                    ? handleDelete()
                    : handleNumber(key)
                }
                style={({ pressed }) => [
                  styles.key,
                  pressed && styles.pressedKey,
                ]}
              >
                {key === "delete" ? (
                  <Ionicons
                    name="backspace-outline"
                    size={25}
                    color={GREEN}
                  />
                ) : (
                  <Text style={styles.keyText}>{key}</Text>
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
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: GREEN,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 13,
    color: "#667765",
    textAlign: "center",
    marginTop: 8,
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
    borderColor: GREEN,
  },

  filledDot: {
    backgroundColor: GREEN,
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DFE8DB",
    alignItems: "center",
    justifyContent: "center",
  },

  pressedKey: {
    backgroundColor: LIGHT_GREEN,
  },

  keyText: {
    fontSize: 25,
    fontWeight: "600",
    color: GREEN,
  },
});