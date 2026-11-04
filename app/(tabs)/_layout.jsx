
import React, { useEffect, useRef, useState } from "react";

import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../../contexts/ThemeContext";

// =============================================
// NAVIGATION CONFIGURATION
// =============================================

const TAB_CONFIG = {
  dashboard: {
    icon: "home-outline",
    activeIcon: "home",
    label: "Home",
  },

  calendar: {
    icon: "calendar-clear-outline",
    activeIcon: "calendar-clear",
    label: "Calendar",
  },

  assistant: {
    icon: "sparkles-outline",
    activeIcon: "sparkles",
    label: "Assistant",
  },

  profile: {
    icon: "person-outline",
    activeIcon: "person",
    label: "Profile",
  },
};

const TAB_ORDER = [
  "dashboard",
  "calendar",
  "assistant",
  "profile",
];

// =============================================
// ANIMATED REGULAR TAB
// =============================================

function AnimatedTab({
  route,
  focused,
  onPress,
  onLongPress,
  width,
  palette,
}) {
  const config = TAB_CONFIG[route];

  const progress = useRef(
    new Animated.Value(focused ? 1 : 0)
  ).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [focused, progress]);

  if (!config) return null;

  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [
      "rgba(168,203,160,0)",
      palette.activeBackground,
    ],
  });

  const iconScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const labelOpacity = progress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0, 1],
  });

  const labelHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 14],
  });

  return (
    <View style={[styles.tabWrapper, { width }]}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={config.label}
        style={styles.pressable}
      >
        <Animated.View
          style={[
            styles.tabItem,
            { backgroundColor },
          ]}
        >
          <Animated.View
            style={{
              transform: [{ scale: iconScale }],
            }}
          >
            <Ionicons
              name={
                focused
                  ? config.activeIcon
                  : config.icon
              }
              size={21}
              color={
                focused
                  ? palette.activeIcon
                  : palette.inactiveIcon
              }
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.labelContainer,
              {
                height: labelHeight,
                opacity: labelOpacity,
              },
            ]}
          >
            <Animated.Text
              numberOfLines={1}
              style={[
                styles.tabLabel,
                { color: palette.activeText },
              ]}
            >
              {config.label}
            </Animated.Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

// =============================================
// BIG CENTER ADD TASK BUTTON
// =============================================

function AddTaskButton({ width, palette }) {
  const router = useRouter();

  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value) => {
    Animated.spring(scale, {
      toValue: value,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={[styles.centerSlot, { width }]}>
      <Animated.View
        style={[
          styles.addButtonAnimated,
          { transform: [{ scale }] },
        ]}
      >
        <Pressable
          onPress={() => router.push("/create-task")}
          onPressIn={() => animateTo(0.9)}
          onPressOut={() => animateTo(1)}
          accessibilityRole="button"
          accessibilityLabel="Add Task"
          style={[
            styles.addButton,
            {
              backgroundColor:
                palette.activeBackground,
              borderColor: palette.barBackground,
            },
          ]}
        >
          <Ionicons
            name="add"
            size={35}
            color={palette.activeIcon}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

// =============================================
// CUSTOM BOTTOM NAVIGATION
// =============================================

function CustomTabBar({ state, navigation }) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  // Hide floating tabs when the keyboard opens.
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios"
        ? "keyboardWillShow"
        : "keyboardDidShow";

    const hideEvent =
      Platform.OS === "ios"
        ? "keyboardWillHide"
        : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(
      showEvent,
      () => setKeyboardOpen(true)
    );

    const hideSubscription = Keyboard.addListener(
      hideEvent,
      () => setKeyboardOpen(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const palette = {
    background: colors.background,

    barBackground: isDark
      ? "#202E23"
      : "#2C2C2C",

    activeBackground: "#A8CBA0",
    activeIcon: "#1B3A1A",
    activeText: "#1B3A1A",

    inactiveIcon: isDark
      ? "#B4C8B6"
      : "#D0D0D0",

    border: isDark
      ? "#3E5743"
      : "transparent",
  };

  const availableWidth = Math.max(
    250,
    screenWidth - 38
  );

  const centerWidth = Math.min(
    76,
    availableWidth * 0.22
  );

  const regularWidth =
    (availableWidth - centerWidth) / 4;

  const renderTab = (routeName) => {
    const route = state.routes.find(
      (item) => item.name === routeName
    );

    if (!route) return null;

    const routeIndex = state.routes.findIndex(
      (item) => item.key === route.key
    );

    const focused = state.index === routeIndex;

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    const onLongPress = () => {
      navigation.emit({
        type: "tabLongPress",
        target: route.key,
      });
    };

    return (
      <AnimatedTab
        key={route.key}
        route={routeName}
        focused={focused}
        onPress={onPress}
        onLongPress={onLongPress}
        width={regularWidth}
        palette={palette}
      />
    );
  };

  // Returning null removes the floating bar entirely.
  // It will reappear when the keyboard closes.
  if (keyboardOpen) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: palette.barBackground,
            borderColor: palette.border,
          },
        ]}
      >
        {renderTab(TAB_ORDER[0])}
        {renderTab(TAB_ORDER[1])}

        <AddTaskButton
          width={centerWidth}
          palette={palette}
        />

        {renderTab(TAB_ORDER[2])}
        {renderTab(TAB_ORDER[3])}
      </View>
    </View>
  );
}

// =============================================
// TABS LAYOUT
// =============================================

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => (
        <CustomTabBar {...props} />
      )}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Home" }}
      />

      <Tabs.Screen
        name="calendar"
        options={{ title: "Calendar" }}
      />

      <Tabs.Screen
        name="assistant"
        options={{ title: "Assistant" }}
      />

      <Tabs.Screen
        name="profile"
        options={{ title: "Profile" }}
      />

      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          href: null,
        }}
      />

      <Tabs.Screen
        name="notes"
        options={{
          title: "Notes",
          href: null,
        }}
      />
    </Tabs>
  );
}

// =============================================
// STYLES
// =============================================

const styles = StyleSheet.create({
  container: {
    // Stay in the tab navigator's layout so screens reserve this space.
    // The bar still looks floating because its container is transparent.
    paddingTop: 16,
    paddingHorizontal: 10,

    backgroundColor: "transparent",
  },

  tabBar: {
    height: 58,
    borderRadius: 30,
    borderWidth: 1,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 8,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },

  tabWrapper: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  pressable: {
    width: "100%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  tabItem: {
    width: "100%",
    height: 48,
    borderRadius: 22,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },

  labelContainer: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },

  tabLabel: {
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
    includeFontPadding: false,
  },

  centerSlot: {
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },

  addButtonAnimated: {
    position: "absolute",
    top: -17,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 10,
  },

  addButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 5,

    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 8,
  },
});
