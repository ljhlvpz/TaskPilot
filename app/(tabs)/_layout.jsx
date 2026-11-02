
import React, { useEffect, useRef } from "react";

import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../../contexts/ThemeContext";

// =============================================
// TAB CONFIGURATION
// =============================================

const TAB_CONFIG = {
  dashboard: {
    icon: "home-outline",
    activeIcon: "home",
    label: "Home",
  },

  tasks: {
    icon: "checkmark-circle-outline",
    activeIcon: "checkmark-circle",
    label: "Tasks",
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

  notes: {
    icon: "document-text-outline",
    activeIcon: "document-text",
    label: "Notes",
  },

  profile: {
    icon: "person-outline",
    activeIcon: "person",
    label: "Profile",
  },
};

// =============================================
// ANIMATED TAB
// =============================================

function AnimatedTab({
  route,
  focused,
  onPress,
  onLongPress,
  activeWidth,
  inactiveWidth,
  palette,
}) {
  const config = TAB_CONFIG[route];

  const progress = useRef(
    new Animated.Value(focused ? 1 : 0)
  ).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [focused, progress]);

  if (!config) return null;

  // Expand the active tab and shrink the inactive tab.
  const animatedWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveWidth, activeWidth],
  });

  // Animate the green selected background.
  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [
      "rgba(168,203,160,0)",
      palette.activeBackground,
    ],
  });

  // Animate the label's available width.
  // This prevents invisible labels from taking up space.
  const labelWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 48],
  });

  const labelOpacity = progress.interpolate({
    inputRange: [0, 0.65, 1],
    outputRange: [0, 0, 1],
  });

  const labelTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-5, 0],
  });

  return (
    <Animated.View
      style={[
        styles.tabWrapper,
        {
          width: animatedWidth,
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="tab"
        accessibilityState={{
          selected: focused,
        }}
        accessibilityLabel={config.label}
        style={styles.pressable}
      >
        <Animated.View
          style={[
            styles.tabItem,
            {
              backgroundColor,
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <Ionicons
              name={
                focused
                  ? config.activeIcon
                  : config.icon
              }
              size={20}
              color={
                focused
                  ? palette.activeIcon
                  : palette.inactiveIcon
              }
            />
          </View>

          <Animated.View
            style={[
              styles.labelContainer,
              {
                width: labelWidth,
                opacity: labelOpacity,
                transform: [
                  {
                    translateX: labelTranslate,
                  },
                ],
              },
            ]}
          >
            <Animated.Text
              numberOfLines={1}
              style={[
                styles.tabLabel,
                {
                  color: palette.activeText,
                },
              ]}
            >
              {config.label}
            </Animated.Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// =============================================
// CUSTOM BOTTOM NAVIGATION
// =============================================

function CustomTabBar({ state, navigation }) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

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

  const visibleRoutes = state.routes.filter(
    (route) => TAB_CONFIG[route.name]
  );

  const count = visibleRoutes.length;

  // Account for screen margins, bar borders, and padding.
  const availableWidth = Math.max(
    0,
    screenWidth - 38
  );

  // Selected tab stays compact.
  const activeWidth = Math.min(
    88,
    availableWidth * 0.26
  );

  // Remaining space is divided evenly between other tabs.
  const inactiveWidth =
    count > 1
      ? (availableWidth - activeWidth) / (count - 1)
      : availableWidth;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.background,
          paddingBottom: Math.max(
            insets.bottom,
            8
          ),
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
        {visibleRoutes.map((route) => {
          const routeIndex = state.routes.findIndex(
            (item) => item.key === route.key
          );

          const focused =
            state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (
              !focused &&
              !event.defaultPrevented
            ) {
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
              route={route.name}
              focused={focused}
              onPress={onPress}
              onLongPress={onLongPress}
              activeWidth={activeWidth}
              inactiveWidth={inactiveWidth}
              palette={palette}
            />
          );
        })}
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
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Home" }}
      />

      <Tabs.Screen
        name="tasks"
        options={{ title: "Tasks" }}
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
        name="notes"
        options={{ title: "Notes" }}
      />

      <Tabs.Screen
        name="profile"
        options={{ title: "Profile" }}
      />
    </Tabs>
  );
}

// =============================================
// STYLES
// =============================================

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingHorizontal: 10,
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
    height: 44,
    borderRadius: 22,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 0,
  },

  iconContainer: {
    width: 24,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  labelContainer: {
    overflow: "hidden",
  },

  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 3,
  },
});
