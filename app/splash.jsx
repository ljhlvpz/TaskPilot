import { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";

import { useAuth } from "../hooks/useAuth";

export default function SplashScreen() {
  const { user, authLoading } = useAuth();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;

  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(15)).current;

  const tagOpacity = useRef(new Animated.Value(0)).current;
  const tagTranslateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Logo appears
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),

      // Small pause
      Animated.delay(150),

      // 2. TaskPilot text appears
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),

      // 3. Tagline appears
      Animated.delay(100),

      Animated.parallel([
        Animated.timing(tagOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(tagTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),

      // Hold the completed logo
      Animated.delay(400),

      // Fade everything out
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(tagOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const timer = setTimeout(() => {
      if (user) {
        router.replace("/(tabs)/dashboard");
      } else {
        router.replace("/(auth)/login");
      }
    }, 2300);

    return () => clearTimeout(timer);
  }, [authLoading, user]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../assets/TaskPilot Logo.png")}
        style={[
          styles.logo,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
        resizeMode="contain"
      />

      <Animated.Image
        source={require("../assets/TaskPilot Text.png")}
        style={[
          styles.taskPilotText,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
        resizeMode="contain"
      />

      <Animated.Image
        source={require("../assets/TaskPilot Tag.png")}
        style={[
          styles.tagline,
          {
            opacity: tagOpacity,
            transform: [{ translateY: tagTranslateY }],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 150,
    height: 150,
    marginBottom: 18,
  },

  taskPilotText: {
    width: 260,
    height: 70,
    marginBottom: 4,
  },

  tagline: {
    width: 220,
    height: 35,
  },
});