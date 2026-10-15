import { useEffect, useState } from "react";
import {
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
import { Link, useRouter } from "expo-router";

import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import {
  loginUser,
  forgotPassword,
  googleLoginUser,
} from "../../services/authService";

import {
  isRequired,
  isValidEmail,
  isValidPassword,
} from "../../utils/validators";

const COLORS = {
  deepGreen: "#1B3A1A",
  mediumGreen: "#4E6E4D",
  lightGreen: "#A8CBA0",
  charcoal: "#2C2C2C",
  offWhite: "#F0F0F0",
  white: "#FFFFFF",
  input: "#353535",
  placeholder: "#A9A9A9",
};

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "147193579745-i07b7eg9ijt1iev8lqtfaiqjmqk4bou5.apps.googleusercontent.com",
    });
  }, []);

  // =========================================
  // EMAIL LOGIN
  // =========================================

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

  // =========================================
  // GOOGLE LOGIN
  // =========================================

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const response = await GoogleSignin.signIn();

      // User pressed Back / cancelled Google Sign-In
      if (response?.type !== "success") {
        return;
      }

      let idToken = response?.data?.idToken;

      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens?.idToken;
      }

      if (!idToken) {
        throw new Error(
          "Google did not return an ID token."
        );
      }

      await googleLoginUser(idToken);

      router.replace("/(tabs)/dashboard");
    } catch (error) {
      console.error(
        "Google Sign-In error:",
        error
      );

      if (
        error.code === statusCodes.SIGN_IN_CANCELLED
      ) {
        return;
      }

      Alert.alert(
        "Google Sign-In Failed",
        "Unable to sign in with Google. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // FORGOT PASSWORD
  // =========================================

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert(
        "Email Required",
        "Please enter your email address first."
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

    try {
      setLoading(true);

      await forgotPassword(cleanEmail);

      Alert.alert(
        "Reset Email Sent",
        "Check your email for a password reset link."
      );
    } catch (error) {
      console.error(
        "Forgot password error:",
        error
      );

      let message =
        "Unable to send a password reset email. Please try again.";

      if (error.code === "auth/user-not-found") {
        message =
          "No account was found with that email address.";
      } else if (
        error.code === "auth/network-request-failed"
      ) {
        message =
          "Unable to connect. Please check your internet connection.";
      }

      Alert.alert(
        "Reset Failed",
        message
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
        style={styles.keyboard}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* =====================================
              TOP LIGHT GREEN AREA
          ===================================== */}

          <View style={styles.topArea}>

            <Image
              source={require("../../assets/login-pattern.png")}
              style={styles.pattern}
              resizeMode="contain"
            />

            <View style={styles.patternOverlay} />

            <Image
              source={require("../../assets/TaskPilot Text.png")}
              style={styles.logoText}
              resizeMode="contain"
            />

          </View>


          {/* =====================================
              DARK LOGIN PANEL
          ===================================== */}

          <View style={styles.darkPanel}>

            <Text style={styles.title}>
              <Text style={styles.titleGreen}>
                Welcome
              </Text>{" "}
              Back
            </Text>

            <Text style={styles.subtitle}>
              Stay on track, one task at a time.
            </Text>


            {/* EMAIL */}

            <View style={styles.inputContainer}>

              <Ionicons
                name="mail-outline"
                size={20}
                color="#D0D0D0"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={
                  COLORS.placeholder
                }
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />

            </View>


            {/* PASSWORD */}

            <View style={styles.inputContainer}>

              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#D0D0D0"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={
                  COLORS.placeholder
                }
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />

              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={21}
                  color="#D0D0D0"
                />
              </Pressable>

            </View>


            {/* FORGOT PASSWORD */}

            <Pressable
              onPress={handleForgotPassword}
              disabled={loading}
              style={styles.forgotButton}
            >
              <Text style={styles.forgotText}>
                Forgot Password?
              </Text>
            </Pressable>


            {/* LOGIN BUTTON */}

            <Pressable
              style={[
                styles.loginButton,
                loading &&
                styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading
                  ? "Signing In..."
                  : "Login"}
              </Text>
            </Pressable>


            {/* DIVIDER */}

            <View style={styles.dividerRow}>

              <View style={styles.divider} />

              <Text style={styles.dividerText}>
                or continue with
              </Text>

              <View style={styles.divider} />

            </View>


            {/* GOOGLE BUTTON */}

            <Pressable
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={loading}
            >

              <Text style={styles.googleG}>
                G
              </Text>

              <Text style={styles.googleText}>
                Continue with Google
              </Text>

            </Pressable>


            {/* REGISTER */}

            <View style={styles.footer}>

              <Text style={styles.footerText}>
                Don't have an account?
              </Text>

              <Link
                href="/(auth)/register"
                asChild
              >
                <Pressable
                  disabled={loading}
                >
                  <Text style={styles.registerText}>
                    {" "}Register
                  </Text>
                </Pressable>
              </Link>

            </View>

          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}


// =============================================
// STYLES
// =============================================

const styles = StyleSheet.create({

  screen: {
    flex: 1,
    backgroundColor: COLORS.lightGreen,
  },

  keyboard: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  // -----------------------------------------
  // TOP AREA
  // -----------------------------------------

  topArea: {
    height: 300,
    backgroundColor: COLORS.lightGreen,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 95,
    position: "relative",
    overflow: "hidden",
  },

  logoText: {
    width: 300,
    height: 85,
    zIndex: 5,
  },

  pattern: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: 560,
  },

  patternOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.lightGreen,
    opacity: 0.05,
  },

  patternBackground: {
    ...StyleSheet.absoluteFillObject,
  },


  patternImage: {
    opacity: 0.45,
    resizeMode: "cover",
  },



  // -----------------------------------------
  // DARK PANEL
  // -----------------------------------------

  darkPanel: {
    flex: 1,
    backgroundColor: COLORS.charcoal,

    marginTop: -85,

    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,

    paddingHorizontal: 28,
    paddingTop: 65,
    paddingBottom: 40,

    minHeight: 570,
  },

  // -----------------------------------------
  // TITLE
  // -----------------------------------------

  title: {
    fontSize: 34,
    fontWeight: "800",
    color: COLORS.white,
    textAlign: "center",
    marginBottom: 8,
  },

  titleGreen: {
    color: COLORS.lightGreen,
  },

  subtitle: {
    color: "#D0D0D0",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 28,
  },

  // -----------------------------------------
  // INPUTS
  // -----------------------------------------

  inputContainer: {
    height: 56,
    backgroundColor: COLORS.input,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 12,
  },

  inputIcon: {
    width: 25,
    marginRight: 8,
    textAlign: "center",
  },

  input: {
    flex: 1,
    height: "100%",
    color: COLORS.white,
    fontSize: 16,
  },

  eyeButton: {
    padding: 8,
    marginLeft: 5,
  },

  eyeIcon: {
    fontSize: 21,
    color: "#D0D0D0",
  },

  // -----------------------------------------
  // FORGOT PASSWORD
  // -----------------------------------------

  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: 7,
    marginBottom: 18,
  },

  forgotText: {
    color: COLORS.lightGreen,
    fontSize: 14,
    fontWeight: "700",
  },

  // -----------------------------------------
  // LOGIN BUTTON
  // -----------------------------------------

  loginButton: {
    height: 56,
    borderRadius: 30,
    backgroundColor: COLORS.lightGreen,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },

  loginButtonText: {
    color: COLORS.deepGreen,
    fontSize: 16,
    fontWeight: "800",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  // -----------------------------------------
  // DIVIDER
  // -----------------------------------------

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
    color: "#BDBDBD",
    fontSize: 13,
    marginHorizontal: 12,
  },

  // -----------------------------------------
  // GOOGLE
  // -----------------------------------------

  googleButton: {
    height: 56,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },

  googleG: {
    fontSize: 22,
    fontWeight: "800",
    color: "#4285F4",
    marginRight: 10,
  },

  googleText: {
    color: COLORS.charcoal,
    fontSize: 16,
    fontWeight: "600",
  },

  // -----------------------------------------
  // FOOTER
  // -----------------------------------------

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },

  footerText: {
    color: "#D0D0D0",
    fontSize: 14,
  },

  registerText: {
    color: COLORS.lightGreen,
    fontSize: 14,
    fontWeight: "800",
  },

});