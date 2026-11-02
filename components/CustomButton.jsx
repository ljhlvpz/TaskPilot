import React from "react";
import { useAppTheme } from "../contexts/ThemeContext";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Theme } from "../constants/theme";

export default function CustomButton({
  title,
  onPress,
  type = "primary",
  disabled = false,
}) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => make_styles(colors), [colors]);

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

const make_styles = (colors) => StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: Theme.radius.md,
    alignItems: "center",
    marginVertical: Theme.spacing.sm,
  },

  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  disabledButton: {
    opacity: 0.5,
  },

  text: {
    color: colors.surface,
    fontSize: Theme.fonts.body,
    fontWeight: "600",
  },

  secondaryText: {
    color: colors.text,
  },
});