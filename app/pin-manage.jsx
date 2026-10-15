
import { useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    DeviceEventEmitter,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
    useLocalSearchParams,
    useRouter,
} from "expo-router";

import { useAuth } from "../hooks/useAuth";
import PinKeypad from "../components/PinKeypad";

import {
    verifyPin,
    savePin,
    removePin,
    setAppLockEnabled,
} from "../utils/pinStorage";

export default function PinManage() {
    const router = useRouter();
    const { action } = useLocalSearchParams();
    const { user } = useAuth();

    const mode =
        action === "remove"
            ? "remove"
            : action === "disable-lock"
                ? "disable-lock"
                : "change";

    const [step, setStep] = useState("verify");
    const [newPin, setNewPin] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [lockedOut, setLockedOut] = useState(false);
    const attempts = useRef(0);

    const title =
        step === "verify"
            ? "Verify Current PIN"
            : step === "new"
                ? "Create New PIN"
                : "Confirm New PIN";

    const subtitle =
        step === "verify"
            ? "Enter your current 4-digit PIN to continue."
            : step === "new"
                ? "Choose a new 4-digit PIN."
                : "Enter your new PIN again.";

    async function handleComplete(pin) {
        if (!user?.uid || busy || lockedOut) return;

        setBusy(true);
        setError("");

        try {
            if (step === "verify") {
                const correct = await verifyPin(
                    user.uid,
                    pin
                );

                if (!correct) {
                    attempts.current += 1;

                    if (attempts.current >= 5) {
                        setLockedOut(true);
                        setError(
                            "Too many incorrect attempts. Please try again later."
                        );
                    } else {
                        setError(
                            "Incorrect PIN. Please try again."
                        );
                    }

                    return;
                }

                attempts.current = 0;

                // DISABLE APP LOCK
                if (mode === "disable-lock") {
                    await setAppLockEnabled(
                        user.uid,
                        false
                    );

                    DeviceEventEmitter.emit(
                        "taskpilot-app-lock-changed",
                        user.uid
                    );

                    Alert.alert(
                        "App Lock Disabled",
                        "TaskPilot will no longer ask for your PIN when reopening.",
                        [
                            {
                                text: "OK",
                                onPress: () => router.back(),
                            },
                        ]
                    );

                    return;
                }

                // REMOVE PIN
                if (mode === "remove") {
                    Alert.alert(
                        "Remove PIN?",
                        "This will remove your PIN protection from this device.",
                        [
                            {
                                text: "Cancel",
                                style: "cancel",
                            },
                            {
                                text: "Remove",
                                style: "destructive",
                                onPress: async () => {
                                    try {
                                        setBusy(true);

                                        await removePin(user.uid);

                                        DeviceEventEmitter.emit(
                                            "taskpilot-app-lock-changed",
                                            user.uid
                                        );

                                        Alert.alert(
                                            "PIN Removed",
                                            "Your PIN has been removed successfully.",
                                            [
                                                {
                                                    text: "OK",
                                                    onPress: () =>
                                                        router.back(),
                                                },
                                            ]
                                        );
                                    } catch (err) {
                                        console.error(
                                            "Remove PIN error:",
                                            err
                                        );

                                        Alert.alert(
                                            "Error",
                                            "Unable to remove your PIN."
                                        );
                                    } finally {
                                        setBusy(false);
                                    }
                                },
                            },
                        ]
                    );

                    return;
                }

                // CHANGE PIN
                setStep("new");
                return;
            }

            if (step === "new") {
                setNewPin(pin);
                setStep("confirm");
                return;
            }

            if (step === "confirm") {
                if (pin !== newPin) {
                    setNewPin("");
                    setStep("new");
                    setError(
                        "PINs did not match. Please try again."
                    );
                    return;
                }

                await savePin(user.uid, pin);

                Alert.alert(
                    "PIN Changed",
                    "Your new PIN has been saved successfully.",
                    [
                        {
                            text: "OK",
                            onPress: () => router.back(),
                        },
                    ]
                );
            }
        } catch (err) {
            console.error(
                "PIN management error:",
                err
            );

            setError(
                "Something went wrong. Please try again."
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <SafeAreaView
            style={styles.screen}
            edges={["top", "bottom"]}
        >
            {/* BACK BUTTON */}
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Go back"
            >
                <Ionicons
                    name="arrow-back"
                    size={24}
                    color="#1B3A1A"
                />
            </TouchableOpacity>

            {/* PIN CONTENT */}
            <View style={styles.content}>
                <Text style={styles.title}>
                    {title}
                </Text>

                <Text style={styles.subtitle}>
                    {subtitle}
                </Text>

                {!lockedOut && (
                    <PinKeypad
                        key={step}
                        onComplete={handleComplete}
                        disabled={busy}
                    />
                )}

                {!!error && (
                    <Text style={styles.error}>
                        {error}
                    </Text>
                )}

                {busy && (
                    <ActivityIndicator
                        color="#456B4A"
                        style={{ marginTop: 16 }}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#F0F0F0",
        paddingHorizontal: 16,
    },

    backButton: {
        width: 42,
        height: 42,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#A8CBA0",
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 12,
    },

    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: 50,
    },

    lockIcon: {
        fontSize: 48,
        marginBottom: 16,
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
        textAlign: "center",
        marginTop: 10,
        marginBottom: 28,
    },

    error: {
        color: "#B42318",
        marginTop: 18,
        textAlign: "center",
    },
});
