import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";

import { Link, router } from "expo-router";

import ScreenContainer from "../../components/ScreenContainer";
import Logo from "../../components/Logo";
import CustomInput from "../../components/CustomInput";
import CustomButton from "../../components/CustomButton";

import { Theme } from "../../constants/theme";

import { useState } from "react";


import { registerUser } from "../../services/authService";
import { createUserProfile } from "../../firebase/firestore";
import {
  isRequired,
  isValidEmail,
  isValidPassword,
  passwordsMatch,
} from "../../utils/validators";

export default function Register() {
const [fullName, setFullName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [loading, setLoading] = useState(false);
const handleRegister = async () => {
  if (!isRequired(fullName)) {
    return Alert.alert("Error", "Full name is required.");
  }

  if (!isValidEmail(email)) {
    return Alert.alert("Error", "Invalid email address.");
  }

  if (!isValidPassword(password)) {
    return Alert.alert(
      "Error",
      "Password must be at least 8 characters."
    );
  }

  if (!passwordsMatch(password, confirmPassword)) {
    return Alert.alert("Error", "Passwords do not match.");
  }

  try {
    setLoading(true);

    const userCredential = await registerUser(email, password);

    await createUserProfile(userCredential.user.uid, {
      fullName,
      email,
      createdAt: new Date().toISOString(),
      pinEnabled: false,
      aiEnabled: true,
    });

    Alert.alert(
      "Success",
      "Account created successfully!"
    );

    router.replace("/(auth)/login");

  } catch (error) {
    Alert.alert("Registration Failed", error.message);
  } finally {
    setLoading(false);
  }
};
  return (
    <ScreenContainer>
      <Logo />

      <Text style={styles.title}>Create Account</Text>

      <Text style={styles.subtitle}>
        Create your TaskPilot account.
      </Text>

      <CustomInput
  placeholder="Full Name"
  value={fullName}
  onChangeText={setFullName}
/>

      <CustomInput
  placeholder="Email"
  keyboardType="email-address"
  value={email}
  onChangeText={setEmail}
/>

      <CustomInput
  placeholder="Password"
  secureTextEntry
  value={password}
  onChangeText={setPassword}
/>

     <CustomInput
  placeholder="Confirm Password"
  secureTextEntry
  value={confirmPassword}
  onChangeText={setConfirmPassword}
/>
  <CustomButton
    title={loading ? "Creating Account..." : "Create Account"}
    onPress={handleRegister}
    disabled={loading}
/>

      <CustomButton
        title="Continue with Google"
        type="secondary"
        onPress={() => {}}
      />

      <View style={styles.footer}>
        <Text>Already have an account? </Text>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity>
            <Text style={styles.login}>
              Sign In
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: Theme.fonts.title,
    fontWeight: "700",
    color: Theme.colors.text,
    marginBottom: 8,
  },

  subtitle: {
    color: Theme.colors.secondaryText,
    marginBottom: 24,
    fontSize: Theme.fonts.body,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },

  login: {
    color: Theme.colors.primary,
    fontWeight: "700",
  },
});