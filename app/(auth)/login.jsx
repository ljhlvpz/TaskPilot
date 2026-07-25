import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Link, useRouter } from "expo-router";

import ScreenContainer from "../../components/ScreenContainer";
import Logo from "../../components/Logo";
import CustomInput from "../../components/CustomInput";
import CustomButton from "../../components/CustomButton";

import { Theme } from "../../constants/theme";
import { loginUser } from "../../services/authService";
import {
  isRequired,
  isValidEmail,
  isValidPassword,
} from "../../utils/validators";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!isRequired(cleanEmail) || !isRequired(password)) {
      Alert.alert(
        "Missing Information",
        "Please enter your email and password."
      );
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert(
        "Invalid Email",
        "Please enter a valid email address."
      );
      return;
    }

    if (!isValidPassword(password)) {
      Alert.alert(
        "Invalid Password",
        "Your password must contain at least 8 characters."
      );
      return;
    }

    try {
      setLoading(true);

      await loginUser(cleanEmail, password);

      // Temporary destination until we create the PIN screen.
      router.replace("/(tabs)/dashboard");
    } catch (error) {
      console.error("Login error:", error);

      let message = "Unable to sign in. Please try again.";

      switch (error.code) {
        case "auth/invalid-email":
          message = "The email address is invalid.";
          break;

        case "auth/user-disabled":
          message = "This account has been disabled.";
          break;

        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          message = "Incorrect email or password.";
          break;

        case "auth/too-many-requests":
          message =
            "Too many unsuccessful attempts. Please wait before trying again.";
          break;

        case "auth/network-request-failed":
          message =
            "Unable to connect. Please check your internet connection.";
          break;

        default:
          message = error.message || message;
      }

      Alert.alert("Sign In Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Logo />

        <Text style={styles.title}>Welcome Back!</Text>

        <Text style={styles.subtitle}>
          Sign in to continue managing your tasks.
        </Text>

        <CustomInput
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        <CustomInput
          placeholder="Password"
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.forgotContainer}
          disabled={loading}
          onPress={() => {
            // We will connect this next.
          }}
        >
          <Text style={styles.forgotText}>
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <CustomButton
          title={loading ? "Signing In..." : "Sign In"}
          onPress={handleLogin}
          disabled={loading}
        />

        <CustomButton
          title="Continue with Google"
          type="secondary"
          onPress={() => {
            // Google Sign-In will be implemented later.
          }}
          disabled={loading}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don't have an account?{" "}
          </Text>

          <Link href="/(auth)/register" asChild>
            <TouchableOpacity disabled={loading}>
              <Text style={styles.register}>Register</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    maxWidth: 450,
    width: "100%",
    alignSelf: "center",
  },

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

  forgotContainer: {
    alignSelf: "flex-end",
    marginBottom: 16,
  },

  forgotText: {
    color: Theme.colors.primary,
    fontWeight: "600",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },

  footerText: {
    color: Theme.colors.text,
  },

  register: {
    color: Theme.colors.primary,
    fontWeight: "700",
  },
});