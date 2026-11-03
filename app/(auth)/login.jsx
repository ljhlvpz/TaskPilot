
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import {
  loginUser,
  googleLoginUser,
  forgotPassword,
} from "../../services/authService";

import {
  getUserProfile,
  createUserProfile,
} from "../../firebase/firestore";

const WEB_CLIENT_ID =
  "147193579745-i07b7eg9ijt1iev8lqtfaiqjmqk4bou5.apps.googleusercontent.com";

const COLORS = {
  green: "#4E6E4D",
  lightGreen: "#A8CBA0",
  darkGreen: "#1B3A1A",
  charcoal: "#2C2C2C",
  white: "#FFFFFF",
  gray: "#D0D0D0",
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
    });
  }, []);

  const goToDashboard = () => {
    router.replace("/(tabs)/dashboard");
  };

  const ensureGoogleProfile = async (user) => {
    const existing = await getUserProfile(user.uid);

    if (existing) return;

    await createUserProfile(user.uid, {
      fullName:
        user.displayName ||
        user.email?.split("@")[0] ||
        "TaskPilot User",
      email: user.email || "",
      createdAt: new Date().toISOString(),
      pinEnabled: false,
      aiEnabled: true,
    });
  };

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert(
        "Missing Information",
        "Please enter your email and password."
      );
      return;
    }

    try {
      setLoading(true);

      await loginUser(cleanEmail, password);

      goToDashboard();
    } catch (error) {
      console.error("Email login error:", error);

      let message = "Unable to sign in. Please try again.";

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        message = "Incorrect email or password.";
      } else if (error.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (error.code === "auth/too-many-requests") {
        message = "Too many attempts. Please try again later.";
      } else if (error.code === "auth/network-request-failed") {
        message = "Please check your internet connection.";
      }

      Alert.alert("Login Failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const response = await GoogleSignin.signIn();

      if (response?.type !== "success") {
        return;
      }

      let idToken = response?.data?.idToken;

      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens?.idToken;
      }

      if (!idToken) {
        throw new Error("Google did not return an ID token.");
      }

      const credential = await googleLoginUser(idToken);

      await ensureGoogleProfile(credential.user);

      goToDashboard();
    } catch (error) {
      console.error("Google login error:", error);

      if (
        error.code === statusCodes.SIGN_IN_CANCELLED ||
        error.code === statusCodes.IN_PROGRESS
      ) {
        return;
      }

      Alert.alert(
        "Google Sign-In Failed",
        `Code: ${error.code || "unknown"}\n${
          error.message || "Please try again."
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert(
        "Enter Your Email",
        "Enter your email address first, then tap Forgot Password."
      );
      return;
    }

    try {
      setLoading(true);

      await forgotPassword(cleanEmail);

      Alert.alert(
        "Password Reset",
        "If an account exists for this email, a reset link will be sent."
      );
    } catch (error) {
      console.error("Password reset error:", error);

      Alert.alert(
        "Password Reset",
        "We couldn't process your request. Check your email and connection."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.lightGreen}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topArea}>
            <Image
              source={require("../../assets/TaskPilot Text.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.panel}>
            <Text style={styles.title}>
              <Text style={{ color: COLORS.lightGreen }}>
                Welcome
              </Text>{" "}
              Back
            </Text>

            <Text style={styles.subtitle}>
              Sign in to continue using TaskPilot.
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={COLORS.gray}
              />

              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#AAAAAA"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.gray}
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#AAAAAA"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />

              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={21}
                  color={COLORS.gray}
                />
              </Pressable>
            </View>

            <Pressable
              style={styles.forgotButton}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              <Text style={styles.forgotText}>
                Forgot Password?
              </Text>
            </Pressable>

            <Pressable
              style={[styles.primaryButton, loading && styles.disabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.darkGreen} />
              ) : (
                <Text style={styles.primaryText}>
                  Login
                </Text>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>
                or continue with
              </Text>
              <View style={styles.divider} />
            </View>

            <Pressable
              style={[styles.googleButton, loading && styles.disabled]}
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              <Image
                source={require("../../assets/images/google icon.png")}
                style={styles.googleIcon}
                resizeMode="contain"
              />

              <Text style={styles.googleText}>
                Continue with Google
              </Text>
            </Pressable>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Don't have an account?{" "}
              </Text>

              <Pressable
                disabled={loading}
                onPress={() => router.push("/(auth)/register")}
              >
                <Text style={styles.footerLink}>
                  Register
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.lightGreen,
  },
  scrollContent: {
    flexGrow: 1,
  },
  topArea: {
    height: 265,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 55,
  },
  logo: {
    width: 290,
    height: 115,
  },
  panel: {
    flexGrow: 1,
    marginTop: -100,
    paddingHorizontal: 28,
    paddingTop: 58,
    paddingBottom: 45,
    backgroundColor: COLORS.charcoal,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 90,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.white,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: "center",
    marginBottom: 26,
  },
  inputContainer: {
    minHeight: 55,
    backgroundColor: "#353535",
    borderRadius: 30,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 13,
  },
  input: {
    flex: 1,
    minHeight: 55,
    fontSize: 15,
    color: COLORS.white,
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginBottom: 22,
    paddingVertical: 4,
  },
  forgotText: {
    color: COLORS.lightGreen,
    fontWeight: "600",
  },
  primaryButton: {
    height: 56,
    borderRadius: 30,
    backgroundColor: COLORS.lightGreen,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },
  primaryText: {
    color: COLORS.darkGreen,
    fontSize: 16,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.6,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#555555",
  },
  dividerText: {
    color: "#BBBBBB",
    fontSize: 13,
    marginHorizontal: 12,
  },
  googleButton: {
    height: 56,
    backgroundColor: COLORS.white,
    borderRadius: 30,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  googleIcon: {
    width: 22,
    height: 22,
    marginRight: 10,
  },
  googleText: {
    color: COLORS.charcoal,
    fontWeight: "700",
    fontSize: 15,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
  },
  footerText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  footerLink: {
    color: COLORS.lightGreen,
    fontSize: 14,
    fontWeight: "800",
  },
});
