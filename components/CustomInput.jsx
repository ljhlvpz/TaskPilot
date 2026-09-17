import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Theme } from "../constants/theme";

export default function CustomInput({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  leftIcon,
}) {
  const [hidePassword, setHidePassword] = useState(secureTextEntry);

  return (
    <View style={styles.container}>
      {leftIcon && (
        <View style={styles.leftIcon}>
          <Ionicons
            name={leftIcon}
            size={20}
            color={Theme.colors.secondaryText}
          />
        </View>
      )}

      <TextInput
        style={[
          styles.input,
          leftIcon && styles.inputWithLeftIcon,
          secureTextEntry && styles.inputWithPassword,
        ]}
        placeholder={placeholder}
        placeholderTextColor={Theme.colors.secondaryText}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={hidePassword}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />

      {secureTextEntry && (
        <TouchableOpacity
          onPress={() => setHidePassword(!hidePassword)}
          style={styles.eye}
        >
          <Ionicons
            name={hidePassword ? "eye-off" : "eye"}
            size={22}
            color={Theme.colors.secondaryText}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Theme.spacing.sm,
    position: "relative",
  },

  input: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    padding: 16,
    fontSize: Theme.fonts.body,
    color: Theme.colors.text,
    paddingRight: 50,
  },

  inputWithLeftIcon: {
    paddingLeft: 48,
  },

  inputWithPassword: {
    paddingRight: 50,
  },

  leftIcon: {
    position: "absolute",
    left: 16,
    top: 15,
    zIndex: 1,
  },

  eye: {
    position: "absolute",
    right: 15,
    top: 15,
  },
});