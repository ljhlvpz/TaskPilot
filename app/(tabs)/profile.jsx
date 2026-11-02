import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";

import { Theme } from "../../constants/theme";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { getUserProfile } from "../../firebase/firestore";
import { logoutUser } from "../../services/authService";

export default function Profile() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { user, authLoading } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadProfile = async () => {
        if (authLoading) {
          return;
        }

        if (!user?.uid) {
          if (isActive) {
            setProfile(null);
            setLoadingProfile(false);
          }

          return;
        }

        try {
          setLoadingProfile(true);

          const userProfile =
            await getUserProfile(user.uid);

          if (isActive) {
            setProfile(userProfile);
          }
        } catch (error) {
          console.error(
            "Profile loading error:",
            error
          );
        } finally {
          if (isActive) {
            setLoadingProfile(false);
          }
        }
      };

      loadProfile();

      return () => {
        isActive = false;
      };
    }, [user?.uid, authLoading])
  );

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              setLoggingOut(true);

              await logoutUser();

              router.replace("/(auth)/login");
            } catch (error) {
              console.error(
                "Logout error:",
                error
              );

              Alert.alert(
                "Logout Failed",
                "Unable to log out. Please try again."
              );
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  if (authLoading || loadingProfile) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={["top"]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text style={styles.loadingText}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName =
    profile?.name ||
    profile?.fullName ||
    user?.displayName ||
    "TaskPilot User";

  const email =
    profile?.email ||
    user?.email ||
    "No email available";

  const initial =
    displayName
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() || "T";

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Profile
          </Text>

          <Text style={styles.headerSubtitle}>
            Manage your account and preferences.
          </Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {initial}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.name}>
              {displayName}
            </Text>

            <Text style={styles.email}>
              {email}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Account
        </Text>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push("/edit-profile")}
          >
            <View style={styles.menuIcon}>
              <Ionicons
                name="person-outline"
                size={20}
                color={colors.primary}
              />
            </View>

            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>
                Edit Profile
              </Text>

              <Text style={styles.menuSubtitle}>
                Update your personal information
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.secondaryText}
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push("/preferences")}
          >
            <View style={styles.menuIcon}>
              <Ionicons
                name="settings-outline"
                size={20}
                color={colors.primary}
              />
            </View>

            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>
                Preferences
              </Text>

              <Text style={styles.menuSubtitle}>
                Customize your TaskPilot experience
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.secondaryText}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>
          Security & Privacy
        </Text>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push("/security-settings")}
          >
            <View style={styles.menuIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={colors.primary}
              />
            </View>

            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>
                PIN & App Lock
              </Text>

              <Text style={styles.menuSubtitle}>
                Manage your PIN and security preferences
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.secondaryText}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>
          Session
        </Text>

        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.75}
          disabled={loggingOut}
          onPress={handleLogout}
        >
          {loggingOut ? (
            <ActivityIndicator
              size="small"
              color={colors.error}
            />
          ) : (
            <Ionicons
              name="log-out-outline"
              size={20}
              color={colors.error}
            />
          )}

          <Text style={styles.logoutText}>
            {loggingOut
              ? "Logging Out..."
              : "Log Out"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>
          TaskPilot v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },

  header: {
    paddingTop: 12,
    paddingBottom: 20,
  },

  headerTitle: {
    fontSize: Theme.fonts.title,
    fontWeight: "800",
    color: colors.text,
  },

  headerSubtitle: {
    marginTop: 5,
    fontSize: Theme.fonts.body,
    color: colors.secondaryText,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Theme.radius.lg,
    backgroundColor: colors.surface,
  },

  avatar: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 32,
    backgroundColor: colors.primary,
  },

  avatarText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },

  name: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
  },

  email: {
    marginTop: 4,
    fontSize: 13,
    color: colors.secondaryText,
  },

  sectionTitle: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },

  menuCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Theme.radius.lg,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
  },

  menuIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.background,
  },

  menuContent: {
    flex: 1,
    marginLeft: 12,
  },

  menuTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },

  menuSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: colors.secondaryText,
  },

  divider: {
    height: 1,
    marginLeft: 67,
    backgroundColor: colors.border,
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: Theme.radius.lg,
    backgroundColor: colors.surface,
  },

  logoutText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.error,
  },

  versionText: {
    marginTop: 22,
    textAlign: "center",
    fontSize: 11,
    color: colors.secondaryText,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: Theme.fonts.body,
    color: colors.secondaryText,
  },
});