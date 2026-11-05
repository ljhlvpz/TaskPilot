
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
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
  registerUser,
  googleLoginUser,
} from "../../services/authService";

import {
  createUserProfile,
  getUserProfile,
} from "../../firebase/firestore";

import {
  isRequired,
  isValidEmail,
  isValidPassword,
  passwordsMatch,
} from "../../utils/validators";

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

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
    });
  }, []);

  const handleGoogleRegister = async () => {
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

      const user = credential.user;

      // Do not overwrite an existing profile.
      const existingProfile = await getUserProfile(user.uid);

      if (!existingProfile) {
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
      }

      router.replace("/(tabs)/dashboard");
    } catch (error) {
      console.error("Google registration error:", error);

      if (
        error.code === statusCodes.SIGN_IN_CANCELLED ||
        error.code === statusCodes.IN_PROGRESS
      ) {
        return;
      }

      Alert.alert(
        "Google Sign-Up Failed",
        `Code: ${error.code || "unknown"}\n${error.message || "Please try again."
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!isRequired(cleanName)) {
      Alert.alert(
        "Missing Information",
        "Please enter your full name."
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
        "Password must be at least 8 characters."
      );
      return;
    }

    if (!passwordsMatch(password, confirmPassword)) {
      Alert.alert(
        "Passwords Do Not Match",
        "Please make sure both passwords are the same."
      );
      return;
    }

    try {
      setLoading(true);

      const credential = await registerUser(
        cleanEmail,
        password
      );

      await createUserProfile(credential.user.uid, {
        fullName: cleanName,
        email: cleanEmail,
        createdAt: new Date().toISOString(),
        pinEnabled: false,
        aiEnabled: true,
      });

      Alert.alert(
        "Account Created",
        "Your TaskPilot account is ready!",
        [
          {
            text: "Continue",
            onPress: () => {
              router.replace("/(tabs)/dashboard");
            },
          },
        ]
      );
    } catch (error) {
      console.error("Registration error:", error);

      let message =
        "Unable to create your account. Please try again.";

      switch (error.code) {
        case "auth/email-already-in-use":
          message = "An account already exists with this email.";
          break;
        case "auth/invalid-email":
          message = "Please enter a valid email address.";
          break;
        case "auth/weak-password":
          message = "Please use a stronger password.";
          break;
        case "auth/network-request-failed":
          message = "Please check your internet connection.";
          break;
        default:
          message = error.message || message;
      }

      Alert.alert("Registration Failed", message);
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
          <ImageBackground
  source={require("../../assets/login-pattern.png")}
  style={styles.topArea}
  imageStyle={styles.topPattern}
  resizeMode="repeat"
>
            <Image
              source={require("../../assets/TaskPilot Text.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </ImageBackground>

          <View style={styles.panel}>
            <Text style={styles.title}>
              <Text style={{ color: COLORS.lightGreen }}>
                Create
              </Text>{" "}
              Account
            </Text>

            <Text style={styles.subtitle}>
              Create your TaskPilot account.
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.gray}
              />

              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor="#AAAAAA"
                autoCapitalize="words"
                value={fullName}
                onChangeText={setFullName}
                editable={!loading}
              />
            </View>

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

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.gray}
              />

              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor="#AAAAAA"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
              />

              <Pressable
                onPress={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                disabled={loading}
              >
                <Ionicons
                  name={
                    showConfirmPassword
                      ? "eye-outline"
                      : "eye-off-outline"
                  }
                  size={21}
                  color={COLORS.gray}
                />
              </Pressable>
            </View>

            <Pressable
              style={[styles.primaryButton, loading && styles.disabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.darkGreen} />
              ) : (
                <Text style={styles.primaryText}>
                  Create Account
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
              onPress={handleGoogleRegister}
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
                Already have an account?{" "}
              </Text>

              <Pressable
                disabled={loading}
                onPress={() => router.push("/(auth)/login")}
              >
                <Text style={styles.footerLink}>
                  Login
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
    height: 285,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 45,
  },
  topPattern: {
  opacity: 0.40,
  transform: [{ scale: 1.35 }],
},
  logo: {
    width: 300,
    height: 120,
  },
  panel: {
    flexGrow: 1,
    marginTop: -120,
    paddingHorizontal: 28,
    paddingTop: 58,
    paddingBottom: 40,
    minHeight: 690,
    backgroundColor: COLORS.charcoal,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.white,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.gray,
    fontSize: 15,
    textAlign: "center",
    marginBottom: 25,
  },
  inputContainer: {
    minHeight: 54,
    backgroundColor: "#353535",
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 10,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    minHeight: 54,
    color: COLORS.white,
    fontSize: 16,
  },
  primaryButton: {
    height: 56,
    borderRadius: 30,
    backgroundColor: COLORS.lightGreen,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 24,
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
    borderRadius: 30,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },
  googleIcon: {
    width: 22,
    height: 22,
    marginRight: 10,
  },
  googleText: {
    color: COLORS.charcoal,
    fontSize: 16,
    fontWeight: "600",
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
