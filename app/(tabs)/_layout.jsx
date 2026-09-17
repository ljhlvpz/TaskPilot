import { useEffect, useRef } from "react";

import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Theme } from "../../constants/theme";


// =============================================
// TAB CONFIGURATION
// =============================================

const TAB_CONFIG = {
  dashboard: {
    icon: "home-outline",
    label: "Home",
  },

  tasks: {
    icon: "checkmark-circle-outline",
    label: "Tasks",
  },

  calendar: {
    icon: "calendar-outline",
    label: "Calendar",
  },

  assistant: {
    icon: "sparkles-outline",
    label: "Assistant",
  },

  notes: {
    icon: "document-text-outline",
    label: "Notes",
  },

  profile: {
    icon: "person-outline",
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
}) {
  const animation = useRef(
    new Animated.Value(focused ? 1 : 0)
  ).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: focused ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [focused]);

  const config = TAB_CONFIG[route];

  const itemWidth = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [38, 86],
  });

  const backgroundColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [
      "rgba(0,0,0,0)",
      Theme.colors.primaryLight,
    ],
  });

  const labelOpacity = animation.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <Animated.View
      style={[
        styles.tabWrapper,
        {
          width: itemWidth,
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        style={styles.pressable}
      >
        <Animated.View
          style={[
            styles.tabItem,
            {
              width: itemWidth,
              backgroundColor,
            },
          ]}
        >
          <Ionicons
            name={config.icon}
            size={21}
            color={
              focused
                ? Theme.colors.primaryDark
                : "#D0D0D0"
            }
          />

          <Animated.Text
            numberOfLines={1}
            style={[
              styles.tabLabel,
              {
                opacity: labelOpacity,
              },
            ]}
          >
            {config.label}
          </Animated.Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}


// =============================================
// CUSTOM TAB BAR
// =============================================

function CustomTabBar({
  state,
  navigation,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(
            insets.bottom,
            8
          ),
        },
      ]}
    >
      <View style={styles.tabBar}>

        {state.routes.map((route, index) => {
          const focused =
            state.index === index;

          const onPress = () => {
            const event =
              navigation.emit({
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

          return (
            <AnimatedTab
              key={route.key}
              route={route.name}
              focused={focused}
              onPress={onPress}
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
        options={{
          title: "Home",
        }}
      />

      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
        }}
      />

      <Tabs.Screen
        name="assistant"
        options={{
          title: "AI",
        }}
      />

      <Tabs.Screen
        name="notes"
        options={{
          title: "Notes",
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
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
    backgroundColor: Theme.colors.background,

    paddingTop: 8,
    paddingHorizontal: 10,
  },


  tabBar: {
    height: 58,

    backgroundColor: Theme.colors.text,

    borderRadius: 30,

    flexDirection: "row",
    alignItems: "center",

    justifyContent: "space-between",

    paddingHorizontal: 23,
    

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
    height: 48,

    alignItems: "center",
    justifyContent: "center",
  },


  tabItem: {
    height: 46,

    borderRadius: 24,

    flexDirection: "row",

    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 9,
  },


  tabLabel: {
    fontSize: 10,
    fontWeight: "700",

    color: Theme.colors.primaryDark,

    marginLeft: 4,
  },

});