import React from "react";
import { useAppTheme } from "../contexts/ThemeContext";
import { View, Text, StyleSheet } from "react-native";
import { Theme } from "../constants/theme";

export default function Logo() {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => make_styles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>TaskPilot</Text>

      <Text style={styles.tagline}>
        Your AI Productivity Companion
      </Text>
    </View>
  );
}

const make_styles = (colors) => StyleSheet.create({
  container: {
  alignItems: "center",
  marginBottom: Theme.spacing.xl,
},

  logo: {
    fontSize: 34,
    fontWeight: "bold",
    color: colors.primary,
  },

  tagline: {
    marginTop: 6,
    color: colors.secondaryText,
    fontSize: Theme.fonts.body,
  },
});