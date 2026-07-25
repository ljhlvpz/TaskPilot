import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Theme } from "../constants/theme";

export default function CustomButton({
  title,
  onPress,
  type = "primary",
  disabled = false,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        type === "secondary" && styles.secondaryButton,
        disabled && styles.disabledButton,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.text,
          type === "secondary" && styles.secondaryText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 16,
    borderRadius: Theme.radius.md,
    alignItems: "center",
    marginVertical: Theme.spacing.sm,
  },

  secondaryButton: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },

  disabledButton: {
    opacity: 0.5,
  },

  text: {
    color: Theme.colors.surface,
    fontSize: Theme.fonts.body,
    fontWeight: "600",
  },

  secondaryText: {
    color: Theme.colors.text,
  },
});