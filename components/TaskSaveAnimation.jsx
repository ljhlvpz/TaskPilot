import React, { useEffect, useRef } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useAppTheme } from "../contexts/ThemeContext";

// Animated WebP is decoded as an animation rather than replacing PNGs 30x/sec.
// Keep these files at assets/animations/ relative to the project root.
const SAVING_ANIMATION = require("../assets/animations/task-saving.webp");
const SUCCESS_ANIMATION = require("../assets/animations/task-success.webp");

const SUCCESS_FRAME_COUNT = 82;
const FRAME_DURATION_MS = 33;
const SUCCESS_DURATION_MS = SUCCESS_FRAME_COUNT * FRAME_DURATION_MS;

export default function TaskSaveAnimation({
  phase = "idle",
  onSuccessFinished,
}) {
  const { colors } = useAppTheme();
  const finishedCallback = useRef(onSuccessFinished);
  finishedCallback.current = onSuccessFinished;

  useEffect(() => {
    if (phase !== "success") return;

    // Give the success animation time to play before closing the popup.
    const timeout = setTimeout(() => {
      finishedCallback.current?.();
    }, SUCCESS_DURATION_MS + 250);

    return () => clearTimeout(timeout);
  }, [phase]);

  const visible = phase === "saving" || phase === "success";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.animationContainer}>
            {phase === "saving" && (
              <Image
                key="saving-webp"
                source={SAVING_ANIMATION}
                style={styles.animation}
                contentFit="contain"
                autoplay
                transition={0}
              />
            )}
            {phase === "success" && (
              <Image
                key="success-webp"
                source={SUCCESS_ANIMATION}
                style={styles.animation}
                contentFit="contain"
                autoplay
                transition={0}
              />
            )}
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {phase === "saving" ? "Saving your task..." : "Task saved!"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
            {phase === "saving"
              ? "Please wait a moment."
              : "Your task is ready."}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  panel: {
    width: "100%",
    maxWidth: 320,
    paddingHorizontal: 18,
    paddingVertical: 26,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  animationContainer: {
    width: 210,
    height: 210,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  animation: {
    width: 210,
    height: 210,
    backgroundColor: "transparent",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
});
