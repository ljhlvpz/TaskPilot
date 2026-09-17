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
import { Link, router } from "expo-router";

import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import {
  registerUser,
  googleLoginUser,
} from "../../services/authService";

import { createUserProfile } from "../../firebase/firestore";

import {
  isRequired,
  isValidEmail,
  isValidPassword,
  passwordsMatch,
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

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  // =========================================
  // GOOGLE SIGN-IN CONFIGURATION
  // =========================================

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "147193579745-i07b7eg9ijt1iev8lqtfaiqjmqk4bou5.apps.googleusercontent.com",
    });
  }, []);

  // =========================================
  // GOOGLE REGISTRATION
  // =========================================

  const handleGoogleRegister = async () => {
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

      // Fallback in case the token is not directly in the response
      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens?.idToken;
      }

      if (!idToken) {
        throw new Error(
          "Google did not return an ID token."
        );
      }

      // Sign in to Firebase using the Google ID token
      const userCredential =
        await googleLoginUser(idToken);

      // Create the TaskPilot user profile
      await createUserProfile(
        userCredential.user.uid,
        {
          fullName:
            userCredential.user.displayName ||
            userCredential.user.email?.split("@")[0] ||
            "TaskPilot User",

          email:
            userCredential.user.email || "",

          createdAt:
            new Date().toISOString(),

          pinEnabled: false,
          aiEnabled: true,
        }
      );

      // Go to Dashboard
      router.replace("/(tabs)/dashboard");

    } catch (error) {
      console.error(
        "Google Registration error:",
        error
      );

      // User cancelled Google Sign-In
      if (
        error.code ===
        statusCodes.SIGN_IN_CANCELLED
      ) {
        return;
      }

      // Google Sign-In is already running
      if (
        error.code ===
        statusCodes.IN_PROGRESS
      ) {
        return;
      }

      Alert.alert(
        "Google Sign-Up Failed",
        "Unable to create your account with Google. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // REGISTER
  // =========================================

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

      const userCredential = await registerUser(
        cleanEmail,
        password
      );

      await createUserProfile(
        userCredential.user.uid,
        {
          fullName: cleanName,
          email: cleanEmail,
          createdAt: new Date().toISOString(),
          pinEnabled: false,
          aiEnabled: true,
        }
      );

      Alert.alert(
        "Success",
        "Account created successfully!",
        [
          {
            text: "Continue",
            onPress: () => {
              router.replace("/(auth)/login");
            },
          },
        ]
      );

    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      let message =
        "Unable to create your account. Please try again.";

      switch (error.code) {
        case "auth/email-already-in-use":
          message =
            "An account already exists with this email address.";
          break;

        case "auth/invalid-email":
          message =
            "The email address is invalid.";
          break;

        case "auth/weak-password":
          message =
            "The password is too weak. Please use at least 8 characters.";
          break;

        case "auth/network-request-failed":
          message =
            "Unable to connect. Please check your internet connection.";
          break;

        default:
          message =
            error.message || message;
      }

      Alert.alert(
        "Registration Failed",
        message
      );

    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // UI
  // =========================================

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
              DARK REGISTER PANEL
          ===================================== */}

          <View style={styles.darkPanel}>

            {/* TITLE */}

            <Text style={styles.title}>
              <Text style={styles.titleGreen}>
                Create
              </Text>{" "}
              Account
            </Text>

            <Text style={styles.subtitle}>
              Create your TaskPilot account.
            </Text>


            {/* =====================================
                FULL NAME
            ===================================== */}

            <View style={styles.inputContainer}>

              <Ionicons
                name="person-outline"
                size={20}
                color="#D0D0D0"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={
                  COLORS.placeholder
                }
                autoCapitalize="words"
                autoCorrect={false}
                value={fullName}
                onChangeText={setFullName}
                editable={!loading}
              />

            </View>


            {/* =====================================
                EMAIL
            ===================================== */}

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


            {/* =====================================
                PASSWORD
            ===================================== */}

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
                onPress={() =>
                  setShowPassword(!showPassword)
                }
                disabled={loading}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={
                    showPassword
                      ? "eye-outline"
                      : "eye-off-outline"
                  }
                  size={21}
                  color="#D0D0D0"
                />
              </Pressable>

            </View>


            {/* =====================================
                CONFIRM PASSWORD
            ===================================== */}

            <View style={styles.inputContainer}>

              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#D0D0D0"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor={
                  COLORS.placeholder
                }
                secureTextEntry={
                  !showConfirmPassword
                }
                autoCapitalize="none"
                autoCorrect={false}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
              />

              <Pressable
                onPress={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
                disabled={loading}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={
                    showConfirmPassword
                      ? "eye-outline"
                      : "eye-off-outline"
                  }
                  size={21}
                  color="#D0D0D0"
                />
              </Pressable>

            </View>


            {/* =====================================
                REGISTER BUTTON
            ===================================== */}

            <Pressable
              style={[
                styles.registerButton,
                loading &&
                  styles.buttonDisabled,
              ]}
              onPress={handleRegister}
              disabled={loading}
            >

              <Text style={styles.registerButtonText}>
                {loading
                  ? "Creating Account..."
                  : "Create Account"}
              </Text>

            </Pressable>


            {/* =====================================
                DIVIDER
            ===================================== */}

            <View style={styles.dividerRow}>

              <View style={styles.divider} />

              <Text style={styles.dividerText}>
                or continue with
              </Text>

              <View style={styles.divider} />

            </View>


            {/* =====================================
                GOOGLE BUTTON
            ===================================== */}

            <Pressable
              style={[
                styles.googleButton,
                loading &&
                  styles.buttonDisabled,
              ]}
              onPress={handleGoogleRegister}
              disabled={loading}
            >

              <Text style={styles.googleG}>
                G
              </Text>

              <Text style={styles.googleText}>
                Continue with Google
              </Text>

            </Pressable>


            {/* =====================================
                LOGIN FOOTER
            ===================================== */}

            <View style={styles.footer}>

              <Text style={styles.footerText}>
                Already have an account?
              </Text>

              <Link
                href="/(auth)/login"
                asChild
              >
                <Pressable disabled={loading}>

                  <Text style={styles.loginText}>
                    {" "}Sign In
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
    height: 285,
    backgroundColor: COLORS.lightGreen,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 45,
    position: "relative",
    overflow: "hidden",
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

  logoText: {
    width: 300,
    height: 120,
    zIndex: 5,
  },


  // -----------------------------------------
  // DARK PANEL
  // -----------------------------------------

  darkPanel: {
    backgroundColor: COLORS.charcoal,

    marginTop: -120,

    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,

    paddingHorizontal: 28,
    paddingTop: 58,
    paddingBottom: 40,

    minHeight: 690,
  },


  // -----------------------------------------
  // TITLE
  // -----------------------------------------

  title: {
    fontSize: 32,
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
    marginBottom: 25,
  },


  // -----------------------------------------
  // INPUTS
  // -----------------------------------------

  inputContainer: {
    height: 54,
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


  // -----------------------------------------
  // REGISTER BUTTON
  // -----------------------------------------

  registerButton: {
    height: 56,
    borderRadius: 30,
    backgroundColor: COLORS.lightGreen,

    alignItems: "center",
    justifyContent: "center",

    marginTop: 6,
    marginBottom: 24,
  },

  registerButtonText: {
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
    marginTop: 2,
  },

  footerText: {
    color: "#D0D0D0",
    fontSize: 14,
  },

  loginText: {
    color: COLORS.lightGreen,
    fontSize: 14,
    fontWeight: "800",
  },

});