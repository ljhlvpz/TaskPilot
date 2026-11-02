import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  DeviceEventEmitter,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../hooks/useAuth";
import { getAppLockEnabled, verifyPin } from "../utils/pinStorage";
import PinKeypad from "./PinKeypad";

export default function PinGate({ children }) {
  const { user, authLoading } = useAuth();

  const [checking, setChecking] = useState(true);
  const [locked, setLocked] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [blockedUntil, setBlockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  const attempts = useRef(0);
  const lockEnabled = useRef(false);
  const appState = useRef(AppState.currentState);
  const backgrounded = useRef(false);
  const voiceWindowUntil = useRef(0);
  const backgroundAt = useRef(0);
  const pendingLockTimer = useRef(null);
  const deferredVoiceLock = useRef(false);

  const secondsRemaining = Math.max(0, Math.ceil((blockedUntil - now) / 1000));

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
          }
        } catch (err) {
          console.error("App Lock update error:", err);
          if (active) {
            lockEnabled.current = true;
            setLocked(true);
          }
        }
      }
    );

    // The speech recognizer briefly backgrounds the Android activity.
    // Permit only a short, explicitly announced transition; lock if it lasts.
    const voiceSubscription = DeviceEventEmitter.addListener(
      "taskpilot-voice-transition",
      (phase) => {
        if (phase === "begin") {
          voiceWindowUntil.current = Date.now() + 2500;
        } else if (phase === "end") {
          voiceWindowUntil.current = 0;
        }
      }
    );

    const appSubscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appState.current;
      appState.current = nextState;
      console.log("[PinGate] AppState:", previousState, "->", nextState);

      if (nextState === "background") {
        backgrounded.current = true;
        backgroundAt.current = Date.now();
        deferredVoiceLock.current = Date.now() < voiceWindowUntil.current;

        if (lockEnabled.current) {
          if (deferredVoiceLock.current) {
            // If the app stays away, protect it even during voice recognition.
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
        const briefVoiceTransition =
          deferredVoiceLock.current && Date.now() - backgroundAt.current < 900;
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
            if (active) {
              lockEnabled.current = true;
              setLocked(true);
            }
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

  if (authLoading || checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#456B4A" />
      </View>
    );
  }

  if (user && locked) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>TaskPilot Locked</Text>
        <Text style={styles.subtitle}>Enter your PIN to continue</Text>
        <PinKeypad onComplete={handlePin} disabled={verifying || secondsRemaining > 0} />
        {!!error && <Text style={styles.error}>{error}</Text>}
        {secondsRemaining > 0 && (
          <Text style={styles.subtitle}>Try again in {secondsRemaining}s</Text>
        )}
        {verifying && (
          <ActivityIndicator color="#456B4A" style={{ marginTop: 12 }} />
        )}
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 25,
    fontWeight: "800",
    color: "#1B3A1A",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#647067",
    marginTop: 10,
    marginBottom: 25,
    textAlign: "center",
  },
  error: {
    marginTop: 18,
    color: "#B42318",
    textAlign: "center",
  },
});
