import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  DeviceEventEmitter,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
} from "firebase/auth";

import { auth } from "../firebase/firebaseConfig";
import { useAuth } from "../hooks/useAuth";
import { useAppTheme } from "../contexts/ThemeContext";
import { getAppLockEnabled, savePin, verifyPin } from "../utils/pinStorage";
import PinKeypad from "./PinKeypad";

const WEB_CLIENT_ID =
  "147193579745-i07b7eg9ijt1iev8lqtfaiqjmqk4bou5.apps.googleusercontent.com";
const RECOVERY_WINDOW_MS = 5 * 60 * 1000;

export default function PinGate({ children }) {
  const { user, authLoading } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [checking, setChecking] = useState(true);
  const [locked, setLocked] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [blockedUntil, setBlockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [recoveryStep, setRecoveryStep] = useState("idle");
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [keypadVersion, setKeypadVersion] = useState(0);

  const attempts = useRef(0);
  const lockEnabled = useRef(false);
  const appState = useRef(AppState.currentState);
  const backgrounded = useRef(false);
  const voiceWindowUntil = useRef(0);
  const backgroundAt = useRef(0);
  const pendingLockTimer = useRef(null);
  const deferredVoiceLock = useRef(false);
  const recoveryVerifiedAt = useRef(0);
  const recoveryUserId = useRef(null);
  const recoveryBusyRef = useRef(false);

  const secondsRemaining = Math.max(0, Math.ceil((blockedUntil - now) / 1000));
  const headingColor = isDark ? colors.text : "#1B3A1A";
  const mutedColor = colors.secondaryText;
  const errorColor = isDark ? "#FF8C85" : "#B42318";

  const resetRecovery = () => {
    recoveryVerifiedAt.current = 0;
    recoveryUserId.current = null;
    setRecoveryStep("idle");
    setPassword("");
    setFirstPin("");
    setRecoveryError("");
    setKeypadVersion((v) => v + 1);
  };

  useEffect(() => {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  }, []);

  useEffect(() => {
    if (!blockedUntil) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= blockedUntil) {
        setBlockedUntil(0);
        setError("");
      }
    }, 500);
    return () => clearInterval(timer);
  }, [blockedUntil]);

  useEffect(() => {
    let active = true;
    async function initializeLock() {
      if (authLoading) return;
      setChecking(true);
      setLocked(true);
      setError("");
      attempts.current = 0;
      setBlockedUntil(0);
      lockEnabled.current = false;
      resetRecovery();
      if (!user?.uid) {
        if (active) {
          setLocked(false);
          setChecking(false);
        }
        return;
      }
      try {
        const enabled = await getAppLockEnabled(user.uid);
        if (active) {
          lockEnabled.current = enabled;
          setLocked(enabled);
        }
      } catch (err) {
        console.error("App Lock initialization error:", err);
        if (active) {
          setLocked(true);
          setError("Unable to check App Lock. Please restart TaskPilot.");
        }
      } finally {
        if (active) setChecking(false);
      }
    }
    initializeLock();
    return () => { active = false; };
  }, [user?.uid, authLoading]);

  useEffect(() => {
    if (!user?.uid || authLoading) return;
    let active = true;
    const preferenceSubscription = DeviceEventEmitter.addListener(
      "taskpilot-app-lock-changed",
      async (changedUserId) => {
        if (changedUserId !== user.uid) return;
        try {
          const enabled = await getAppLockEnabled(user.uid);
          if (!active) return;
          lockEnabled.current = enabled;
          if (!enabled) {
            setLocked(false);
            setError("");
            resetRecovery();
          }
        } catch (err) {
          console.error("App Lock update error:", err);
          if (active) { lockEnabled.current = true; setLocked(true); }
        }
      }
    );
    const voiceSubscription = DeviceEventEmitter.addListener(
      "taskpilot-voice-transition",
      (phase) => {
        if (phase === "begin") voiceWindowUntil.current = Date.now() + 2500;
        else if (phase === "end") voiceWindowUntil.current = 0;
      }
    );
    const appSubscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appState.current;
      appState.current = nextState;
      if (nextState === "background") {
        backgrounded.current = true;
        backgroundAt.current = Date.now();
        deferredVoiceLock.current = Date.now() < voiceWindowUntil.current;
        // A recovery verification must not survive leaving the app.
        recoveryVerifiedAt.current = 0;
        recoveryUserId.current = null;
        setRecoveryStep((step) => step === "new" || step === "confirm" ? "verify" : step);
        setFirstPin("");
        setPassword("");
        if (lockEnabled.current) {
          if (deferredVoiceLock.current) {
            if (pendingLockTimer.current) clearTimeout(pendingLockTimer.current);
            pendingLockTimer.current = setTimeout(() => {
              pendingLockTimer.current = null;
              if (appState.current === "background") setLocked(true);
            }, 900);
          } else {
            setLocked(true);
          }
        }
        return;
      }
      if (nextState === "active" && previousState !== "active" && backgrounded.current) {
        backgrounded.current = false;
        if (pendingLockTimer.current) {
          clearTimeout(pendingLockTimer.current);
          pendingLockTimer.current = null;
        }
        const briefVoiceTransition = deferredVoiceLock.current && Date.now() - backgroundAt.current < 900;
        deferredVoiceLock.current = false;
        if (briefVoiceTransition) return;
        getAppLockEnabled(user.uid)
          .then((enabled) => {
            if (!active) return;
            lockEnabled.current = enabled;
            setLocked(Boolean(enabled));
          })
          .catch((err) => {
            console.error("App Lock resume error:", err);
            if (active) { lockEnabled.current = true; setLocked(true); }
          });
      }
    });
    return () => {
      active = false;
      preferenceSubscription.remove();
      voiceSubscription.remove();
      appSubscription.remove();
      if (pendingLockTimer.current) clearTimeout(pendingLockTimer.current);
    };
  }, [user?.uid, authLoading]);

  async function handlePin(pin) {
    if (!user?.uid || verifying || Date.now() < blockedUntil) return;
    setVerifying(true);
    setError("");
    try {
      const correct = await verifyPin(user.uid, pin);
      if (correct) {
        attempts.current = 0;
        setBlockedUntil(0);
        resetRecovery();
        setLocked(false);
      } else {
        attempts.current += 1;
        if (attempts.current >= 5) {
          attempts.current = 0;
          const until = Date.now() + 30000;
          setBlockedUntil(until);
          setNow(Date.now());
          setError("Too many incorrect attempts.");
        } else {
          setError("Incorrect PIN. Please try again.");
        }
      }
    } catch (err) {
      console.error("PIN verification error:", err);
      setError("Unable to verify PIN. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  const currentFirebaseUser = () => {
    const current = auth.currentUser;
    if (!current || !user?.uid || current.uid !== user.uid) {
      throw new Error("Your account changed. Please sign in again.");
    }
    return current;
  };

  const beginRecovery = () => {
    setRecoveryError("");
    setPassword("");
    setRecoveryStep("verify");
  };

  async function handleForgotAccountPassword() {
    if (recoveryBusyRef.current) return;
    const current = auth.currentUser;
    if (!current || current.uid !== user?.uid || !current.email ||
        !current.providerData?.some((p) => p.providerId === "password")) {
      setRecoveryError("Password recovery is unavailable for this sign-in method.");
      return;
    }

    recoveryBusyRef.current = true;
    setRecoveryBusy(true);
    setRecoveryError("");
    try {
      await sendPasswordResetEmail(auth, current.email);
      Alert.alert(
        "Check your email",
        "If password reset is available for this account, Firebase will send a reset link. After changing your password, return here and verify with the new password."
      );
    } catch (err) {
      console.error("Password recovery request failed:", err.code || err.message);
      Alert.alert(
        "Password reset request",
        err.code === "auth/network-request-failed"
          ? "Please check your internet connection and try again."
          : err.code === "auth/too-many-requests"
          ? "Too many requests. Please wait and try again later."
          : "We couldn't process the request. Please try again later."
      );
    } finally {
      recoveryBusyRef.current = false;
      setRecoveryBusy(false);
    }
  }

  async function verifyPassword() {
    if (recoveryBusyRef.current || !password) {
      setRecoveryError("Enter your account password.");
      return;
    }
    recoveryBusyRef.current = true;
    setRecoveryBusy(true);
    setRecoveryError("");
    try {
      const current = currentFirebaseUser();
      if (!current.email || !current.providerData.some((p) => p.providerId === "password")) {
        throw new Error("This account does not have password sign-in. Use Google verification instead.");
      }
      const credential = EmailAuthProvider.credential(current.email, password);
      await reauthenticateWithCredential(current, credential);
      currentFirebaseUser();
      recoveryUserId.current = current.uid;
      recoveryVerifiedAt.current = Date.now();
      setPassword("");
      setRecoveryStep("new");
      setKeypadVersion((v) => v + 1);
    } catch (err) {
      console.error("PIN recovery password verification:", err.code || err.message);
      setRecoveryError(
        err.code === "auth/network-request-failed"
          ? "Connect to the internet to verify your account."
          : err.code === "auth/too-many-requests"
          ? "Too many attempts. Please try again later."
          : err.code?.startsWith("auth/")
          ? "Account verification failed. Check your password and try again."
          : err.message || "Unable to verify your account."
      );
    } finally {
      recoveryBusyRef.current = false;
      setRecoveryBusy(false);
    }
  }

  async function verifyGoogle() {
    if (recoveryBusyRef.current) return;
    recoveryBusyRef.current = true;
    setRecoveryBusy(true);
    setRecoveryError("");
    try {
      const current = currentFirebaseUser();
      if (!current.providerData.some((p) => p.providerId === "google.com")) {
        throw new Error("This account does not have Google sign-in. Use password verification instead.");
      }
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Avoid relying on an old Google session for PIN recovery.
      await GoogleSignin.signOut();
      const response = await GoogleSignin.signIn();
      if (response?.type !== "success") return;
      let idToken = response?.data?.idToken;
      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens?.idToken;
      }
      if (!idToken) throw new Error("Google did not provide an authentication token.");
      await reauthenticateWithCredential(current, GoogleAuthProvider.credential(idToken));
      currentFirebaseUser();
      recoveryUserId.current = current.uid;
      recoveryVerifiedAt.current = Date.now();
      setPassword("");
      setRecoveryStep("new");
      setKeypadVersion((v) => v + 1);
    } catch (err) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) return;
      console.error("PIN recovery Google verification:", err.code || err.message);
      setRecoveryError(
        err.code === "auth/network-request-failed"
          ? "Connect to the internet to verify your account."
          : err.code === "auth/user-mismatch" || err.code === "auth/invalid-credential"
          ? "Please verify using the Google account linked to TaskPilot."
          : err.message || "Google account verification failed."
      );
    } finally {
      recoveryBusyRef.current = false;
      setRecoveryBusy(false);
    }
  }

  function handleNewPin(pin) {
    if (recoveryBusyRef.current) return;
    setFirstPin(pin);
    setRecoveryError("");
    setRecoveryStep("confirm");
    setKeypadVersion((v) => v + 1);
  }

  async function handleConfirmPin(pin) {
    if (recoveryBusyRef.current) return;
    if (pin !== firstPin) {
      setRecoveryError("PINs do not match. Create a new PIN and try again.");
      setFirstPin("");
      setRecoveryStep("new");
      setKeypadVersion((v) => v + 1);
      return;
    }
    recoveryBusyRef.current = true;
    setRecoveryBusy(true);
    setRecoveryError("");
    try {
      const current = currentFirebaseUser();
      if (
        recoveryUserId.current !== current.uid ||
        !recoveryVerifiedAt.current ||
        Date.now() - recoveryVerifiedAt.current > RECOVERY_WINDOW_MS ||
        AppState.currentState !== "active"
      ) {
        throw new Error("Verification expired. Please verify your account again.");
      }
      await savePin(current.uid, pin);
      // App Lock stays enabled; only the PIN credential changes.
      attempts.current = 0;
      setBlockedUntil(0);
      setError("");
      resetRecovery();
      setLocked(false);
    } catch (err) {
      console.error("PIN reset error:", err);
      recoveryVerifiedAt.current = 0;
      recoveryUserId.current = null;
      setFirstPin("");
      setRecoveryStep("verify");
      setRecoveryError(err.message || "Unable to reset PIN. Verify your account again.");
    } finally {
      recoveryBusyRef.current = false;
      setRecoveryBusy(false);
    }
  }

  if (authLoading || checking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (user && locked) {
    const hasPassword = user.providerData?.some((p) => p.providerId === "password");
    const hasGoogle = user.providerData?.some((p) => p.providerId === "google.com");
    return (
      <KeyboardAvoidingView
        style={[styles.full, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {recoveryStep === "idle" ? (
            <View style={styles.content}>
              <Text style={[styles.title, { color: headingColor }]}>TaskPilot Locked</Text>
              <Text style={[styles.subtitle, { color: mutedColor }]}>Enter your PIN to continue</Text>
              <PinKeypad onComplete={handlePin} disabled={verifying || secondsRemaining > 0} />
              {!!error && <Text style={[styles.error, { color: errorColor }]}>{error}</Text>}
              {secondsRemaining > 0 && (
                <Text style={[styles.subtitle, { color: mutedColor }]}>Try again in {secondsRemaining}s</Text>
              )}
              {verifying && <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />}
              <Pressable onPress={beginRecovery} disabled={verifying} style={styles.linkButton}>
                <Text style={[styles.linkText, { color: colors.primary }]}>Forgot PIN?</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.recoveryContent}>
              <Text style={[styles.title, { color: headingColor }]}>Reset your PIN</Text>
              <Text style={[styles.recoveryDescription, { color: mutedColor }]}>
                {recoveryStep === "verify"
                  ? "Verify your TaskPilot account before choosing a new PIN."
                  : recoveryStep === "new"
                  ? "Enter a new 4-digit PIN."
                  : "Enter the same PIN again to confirm."}
              </Text>
              {recoveryStep === "verify" ? (
                <View style={styles.verifyBox}>
                  {hasPassword && (
                    <>
                      <TextInput
                        style={[styles.passwordInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                        placeholder="Firebase account password"
                        placeholderTextColor={mutedColor}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={password}
                        onChangeText={setPassword}
                        editable={!recoveryBusy}
                      />
                      <Pressable
                        style={[styles.actionButton, { backgroundColor: colors.primary }, recoveryBusy && styles.disabled]}
                        disabled={recoveryBusy}
                        onPress={verifyPassword}
                      >
                        <Text style={styles.actionText}>Verify with password</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleForgotAccountPassword}
                        disabled={recoveryBusy}
                        accessibilityRole="button"
                        style={styles.passwordResetLink}
                      >
                        <Text style={[styles.linkText, { color: colors.primary }]}>
                          Forgot TaskPilot account password?
                        </Text>
                      </Pressable>
                    </>
                  )}
                  {hasGoogle && (
                    <Pressable
                      style={[styles.actionButton, { backgroundColor: colors.primary }, recoveryBusy && styles.disabled]}
                      disabled={recoveryBusy}
                      onPress={verifyGoogle}
                    >
                      <Text style={styles.actionText}>Verify with Google</Text>
                    </Pressable>
                  )}
                  {!hasPassword && !hasGoogle && (
                    <Text style={{ color: mutedColor, textAlign: "center" }}>
                      No supported sign-in method was found for this account.
                    </Text>
                  )}
                </View>
              ) : (
                <PinKeypad
                  key={`${recoveryStep}-${keypadVersion}`}
                  title={recoveryStep === "new" ? "New PIN" : "Confirm PIN"}
                  pinLength={4}
                  onComplete={recoveryStep === "new" ? handleNewPin : handleConfirmPin}
                  disabled={recoveryBusy}
                />
              )}
              {!!recoveryError && <Text style={[styles.error, { color: errorColor }]}>{recoveryError}</Text>}
              {recoveryBusy && <ActivityIndicator color={colors.primary} style={{ marginTop: 14 }} />}
              <Pressable onPress={resetRecovery} disabled={recoveryBusy} style={styles.linkButton}>
                <Text style={[styles.linkText, { color: colors.primary }]}>Cancel and return to PIN</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  full: { flex: 1 },
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  scrollContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 24, paddingVertical: 36 },
  content: { width: "100%", alignItems: "center" },
  recoveryContent: { width: "100%", maxWidth: 390, alignItems: "center" },
  title: { fontSize: 25, fontWeight: "800", textAlign: "center" },
  subtitle: { fontSize: 14, marginTop: 10, marginBottom: 25, textAlign: "center" },
  recoveryDescription: { fontSize: 14, textAlign: "center", marginTop: 12, marginBottom: 24, lineHeight: 21 },
  error: { marginTop: 18, textAlign: "center", fontSize: 13 },
  linkButton: { paddingHorizontal: 18, paddingVertical: 14, marginTop: 10 },
  linkText: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  verifyBox: { width: "100%", gap: 12 },
  passwordResetLink: { alignItems: "center", paddingVertical: 9, paddingHorizontal: 8 },
  passwordInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, minHeight: 52, fontSize: 15 },
  actionButton: { borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  actionText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  disabled: { opacity: 0.6 },
});
