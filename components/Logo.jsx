import { View, Text, StyleSheet } from "react-native";
import { Theme } from "../constants/theme";

export default function Logo() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>TaskPilot</Text>

      <Text style={styles.tagline}>
        Your AI Productivity Companion
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
  alignItems: "center",
  marginBottom: Theme.spacing.xl,
},

  logo: {
    fontSize: 34,
    fontWeight: "bold",
    color: Theme.colors.primary,
  },

  tagline: {
    marginTop: 6,
    color: Theme.colors.secondaryText,
    fontSize: Theme.fonts.body,
  },
});