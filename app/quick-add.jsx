import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Keyboard, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { useAppTheme } from "../contexts/ThemeContext";
import { auth } from "../firebase/firebaseConfig";
import { addUserTask } from "../services/taskService";
import { scheduleTaskReminder } from "../services/notificationService";

const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const timeLabel = (date) => date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

export default function QuickAdd() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const primary = colors.primary || "#287B48";
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(null);
  const [dueTime, setDueTime] = useState(null);
  const [datePicker, setDatePicker] = useState(false);
  const [timePicker, setTimePicker] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const active = useRef(false);
  const starting = useRef(false);
  const leaving = useRef(false);
  const savingRef = useRef(false);

  useSpeechRecognitionEvent("start", () => {
    active.current = true;
    starting.current = false;
    setVoiceBusy(false);
    setListening(true);
  });
  useSpeechRecognitionEvent("result", (event) => {
    if (leaving.current) return;
    const transcript = event.results?.[0]?.transcript?.trim();
    if (transcript) setTitle(transcript.slice(0, 100));
  });
  useSpeechRecognitionEvent("end", () => {
    active.current = false;
    starting.current = false;
    setVoiceBusy(false);
    setListening(false);
  });
  useSpeechRecognitionEvent("error", (event) => {
    active.current = false;
    starting.current = false;
    setVoiceBusy(false);
    setListening(false);
    if (!leaving.current && !["no-speech", "aborted"].includes(event.error)) {
      Alert.alert("Voice input", "Speech recognition failed. You can type instead.");
    }
  });
  useEffect(() => () => {
    leaving.current = true;
    if (active.current || starting.current) {
      try { ExpoSpeechRecognitionModule.abort(); } catch (_) { }
    }
  }, []);

  const toggleVoice = async () => {
    if (voiceBusy || saving) return;
    if (active.current || listening) {
      setVoiceBusy(true);
      try { await ExpoSpeechRecognitionModule.stop(); }
      catch (_) { active.current = false; setListening(false); setVoiceBusy(false); }
      return;
    }
    Keyboard.dismiss();
    setVoiceBusy(true);
    starting.current = true;
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Microphone permission", "Allow microphone access to dictate a task.");
        return;
      }
      await ExpoSpeechRecognitionModule.start({ lang: "en-US", interimResults: true, continuous: false });
    } catch (_) {
      Alert.alert("Voice unavailable", "You can still type your task.");
    } finally {
      if (!active.current) { starting.current = false; setVoiceBusy(false); }
    }
  };

  const saveTask = async () => {
    if (savingRef.current) return;
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      Alert.alert("Task title needed", "Type or speak a task title first.");
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert("Session expired", "Please sign in to save your task.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    Keyboard.dismiss();
    try {
      if (active.current || starting.current) {
        try { await ExpoSpeechRecognitionModule.abort(); } catch (_) { }
      }
      const taskData = {
        title: cleanTitle,
        description: "",
        category: "Personal",
        priority: "medium",
        importance: 5,
        estimatedMinutes: 60,
        dueDate: dueDate ? dateKey(dueDate) : null,
        dueTime: dueTime ? timeLabel(dueTime) : null,
      };
      if (auth.currentUser?.uid !== uid) throw new Error("Account changed");
      const taskId = await addUserTask(uid, taskData);
      let reminderError = false;
      if (taskData.dueDate && taskData.dueTime && auth.currentUser?.uid === uid) {
        try { await scheduleTaskReminder(uid, taskId, taskData); }
        catch (error) { console.warn("Quick Add reminder scheduling failed:", error); reminderError = true; }
      }
      leaving.current = true;
      Alert.alert(
        "Task saved!",
        reminderError ? "Your task was saved, but its reminder could not be scheduled." : "Your task is ready in My Tasks.",
        [{ text: "View Tasks", onPress: () => router.replace("/(tabs)/tasks") }],
        { cancelable: false }
      );
    } catch (error) {
      console.error("Quick Add failed:", error);
      Alert.alert("Unable to save task", "Please check your connection and try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background || "#F5F7F4" }]} edges={["top", "bottom"]}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.replace("/(tabs)/tasks");
            } else {
              router.replace("/(tabs)/tasks");
            }
          }}
          accessibilityLabel="Back"
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text || "#253A28"} />
        </TouchableOpacity>
        <Text style={[styles.heading, { color: colors.text || "#253A28" }]}>Quick Add Task</Text>
        <Text style={[styles.subheading, { color: colors.secondaryText || "#68766A" }]}>Save a task in seconds. Add more details later.</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Task title *</Text>
          <View style={styles.titleRow}>
            <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Review my notes" maxLength={100}
              style={styles.input} placeholderTextColor="#879287" returnKeyType="done" editable={!saving} />
            <TouchableOpacity onPress={toggleVoice} disabled={voiceBusy || saving} style={[styles.mic, { backgroundColor: primary }]} accessibilityRole="button" accessibilityLabel={listening ? "Stop voice input" : "Speak task title"}>
              <Ionicons name={listening ? "stop" : "mic"} size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>{listening ? "Listening... tap the microphone to stop." : "Tap the microphone to dictate a title."}</Text>
          <Text style={[styles.label, styles.fieldLabel]}>Due date (optional)</Text>
          <TouchableOpacity style={styles.pickerButton} onPress={() => { Keyboard.dismiss(); setTimePicker(false); setDatePicker(true); }} disabled={saving}>
            <Ionicons name="calendar-outline" size={21} color={primary} />
            <Text style={styles.pickerText}>{dueDate ? dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Choose a date"}</Text>
          </TouchableOpacity>
          {dueDate && <TouchableOpacity onPress={() => setDueDate(null)} disabled={saving}><Text style={[styles.clear, { color: primary }]}>Remove date</Text></TouchableOpacity>}
          {datePicker && <DateTimePicker value={dueDate || new Date()} mode="date" minimumDate={new Date()} display={Platform.OS === "ios" ? "spinner" : "calendar"}
            onChange={(event, value) => { if (Platform.OS === "android") setDatePicker(false); if (event.type !== "dismissed" && value) setDueDate(value); }} />}
          {datePicker && Platform.OS === "ios" && <TouchableOpacity onPress={() => setDatePicker(false)}><Text style={[styles.clear, { color: primary }]}>Done</Text></TouchableOpacity>}
          <Text style={[styles.label, styles.fieldLabel]}>Due time (optional)</Text>
          <TouchableOpacity style={styles.pickerButton} onPress={() => { Keyboard.dismiss(); setDatePicker(false); setTimePicker(true); }} disabled={saving}>
            <Ionicons name="time-outline" size={21} color={primary} />
            <Text style={styles.pickerText}>{dueTime ? timeLabel(dueTime) : "Choose a time"}</Text>
          </TouchableOpacity>
          {dueTime && <TouchableOpacity onPress={() => setDueTime(null)} disabled={saving}><Text style={[styles.clear, { color: primary }]}>Remove time</Text></TouchableOpacity>}
          {timePicker && <DateTimePicker value={dueTime || new Date()} mode="time" display={Platform.OS === "ios" ? "spinner" : "clock"}
            onChange={(event, value) => { if (Platform.OS === "android") setTimePicker(false); if (event.type !== "dismissed" && value) setDueTime(value); }} />}
          {timePicker && Platform.OS === "ios" && <TouchableOpacity onPress={() => setTimePicker(false)}><Text style={[styles.clear, { color: primary }]}>Done</Text></TouchableOpacity>}
          <Text style={styles.hint}>Category: Personal  ·  Priority: Medium. You can edit these later.</Text>
        </View>
        <TouchableOpacity onPress={saveTask} disabled={saving} style={[styles.save, { backgroundColor: primary, opacity: saving ? 0.65 : 1 }]} accessibilityRole="button">
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />}
          <Text style={styles.saveText}>{saving ? "Saving..." : "Save Task"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, page: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  back: { width: 42, height: 42, justifyContent: "center" },
  heading: { fontSize: 27, fontWeight: "800", marginTop: 16 },
  subheading: { fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 26 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 20, borderWidth: 1, borderColor: "#D6E4D5" },
  label: { color: "#385A3D", fontWeight: "700", marginBottom: 12 },
  fieldLabel: { marginTop: 20 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: "#C8D8C6", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 13, fontSize: 16, color: "#223325" },
  mic: { width: 50, height: 50, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  hint: { color: "#6D7D6F", fontSize: 12, marginTop: 12, lineHeight: 18 },
  pickerButton: { borderWidth: 1, borderColor: "#C8D8C6", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  pickerText: { color: "#253A28", fontSize: 15 },
  clear: { marginTop: 8, fontWeight: "600", fontSize: 13 },
  save: { marginTop: 22, padding: 17, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  saveText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
