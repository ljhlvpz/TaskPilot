import React from "react";
import { useAppTheme } from "../contexts/ThemeContext";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";

import { Theme } from "../constants/theme";
import { useAuth } from "../hooks/useAuth";
import {
  getUserProfile,
  updateUserProfile,
} from "../firebase/firestore";

export default function EditProfile() {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => make_styles(colors), [colors]);

  const router = useRouter();
  const { user, authLoading } = useAuth();

  const [name, setName] = useState("");
  const [loadingProfile, setLoadingProfile] =
    useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (authLoading) {
        return;
      }

      if (!user?.uid) {
        setLoadingProfile(false);
        return;
      }

      try {
        setLoadingProfile(true);

        const profile =
          await getUserProfile(user.uid);

        setName(
          profile?.name ||
          profile?.fullName ||
          user?.displayName ||
          ""
        );
      } catch (error) {
        console.error(
          "Edit profile loading error:",
          error
        );

        Alert.alert(
          "Unable to Load Profile",
          "Please try again."
        );
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user?.uid, authLoading]);

  const handleSave = async () => {
    const cleanName = name.trim();

    if (!cleanName) {
      Alert.alert(
        "Name Required",
        "Please enter your name."
      );
      return;
    }

    if (!user?.uid) {
      return;
    }

    try {
      setSaving(true);

      await updateUserProfile(
        user.uid,
        {
          name: cleanName,
          email: user.email || "",
        }
      );

      Alert.alert(
        "Profile Updated",
        "Your profile has been updated successfully.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error(
        "Profile update error:",
        error
      );

      Alert.alert(
        "Update Failed",
        "Unable to update your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
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

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color={colors.text}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Edit Profile
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {name.trim().charAt(0).toUpperCase() || "T"}
          </Text>
        </View>

        <Text style={styles.label}>
          Name
        </Text>

        <View style={styles.inputContainer}>
          <Ionicons
            name="person-outline"
            size={20}
            color={colors.secondaryText}
          />

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={
              colors.secondaryText
            }
            autoCapitalize="words"
            maxLength={60}
          />
        </View>

        <Text style={styles.label}>
          Email
        </Text>

        <View
          style={[
            styles.inputContainer,
            styles.disabledInput,
          ]}
        >
          <Ionicons
            name="mail-outline"
            size={20}
            color={colors.secondaryText}
          />

          <Text style={styles.emailText}>
            {user?.email || "No email available"}
          </Text>
        </View>

        <Text style={styles.emailNote}>
          Email changes are not available yet.
        </Text>

        <TouchableOpacity
          style={[
            styles.saveButton,
            saving && styles.saveButtonDisabled,
          ]}
          activeOpacity={0.8}
          disabled={saving}
          onPress={handleSave}
        >
          {saving ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Ionicons
              name="checkmark"
              size={20}
              color="#FFFFFF"
            />
          )}

          <Text style={styles.saveButtonText}>
            {saving
              ? "Saving..."
              : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const make_styles = (colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    paddingHorizontal: 18,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 24,
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
  },

  headerSpacer: {
    width: 42,
  },

  avatar: {
    width: 82,
    height: 82,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    borderRadius: 41,
    backgroundColor: colors.primary,
  },

  avatarText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  label: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },

  inputContainer: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Theme.radius.lg,
    backgroundColor: colors.surface,
  },

  input: {
    flex: 1,
    fontSize: Theme.fonts.body,
    color: colors.text,
  },

  disabledInput: {
    marginBottom: 7,
    opacity: 0.75,
  },

  emailText: {
    flex: 1,
    fontSize: Theme.fonts.body,
    color: colors.secondaryText,
  },

  emailNote: {
    marginBottom: 28,
    fontSize: 11,
    color: colors.secondaryText,
  },

  saveButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: Theme.radius.lg,
    backgroundColor: colors.primary,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    color: colors.secondaryText,
  },
});