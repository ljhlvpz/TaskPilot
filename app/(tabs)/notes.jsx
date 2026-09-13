import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { auth } from "../../firebase/firebaseConfig";

import {
  addUserNote,
  listenToUserNotes,
  editUserNote,
  removeUserNote,
} from "../../services/noteService";

import { Theme } from "../../constants/theme";

export default function NotesScreen() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;

    if (!uid) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const unsubscribe = listenToUserNotes(
      uid,
      (updatedNotes) => {
        setNotes(updatedNotes);
        setLoading(false);
      },
      (error) => {
        console.error("Note listener error:", error);
        setLoading(false);

        Alert.alert(
          "Notes Error",
          "Unable to load your notes. Please try again."
        );
      }
    );

    return unsubscribe;
  }, []);

  const openCreateNote = () => {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setModalVisible(true);
  };

  const openEditNote = (note) => {
    setEditingNote(note);
    setTitle(note.title || "");
    setContent(note.content || "");
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalVisible(false);
    setEditingNote(null);
    setTitle("");
    setContent("");
  };

  const handleSave = async () => {
    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle) {
      Alert.alert("Missing Title", "Please enter a title for your note.");
      return;
    }

    if (!cleanContent) {
      Alert.alert("Missing Content", "Please enter some note content.");
      return;
    }

    const uid = auth.currentUser?.uid;

    if (!uid) {
      Alert.alert("Not Signed In", "Please sign in again.");
      return;
    }

    try {
      setSaving(true);

      if (editingNote) {
        await editUserNote(editingNote.id, {
          title: cleanTitle,
          content: cleanContent,
        });
      } else {
        await addUserNote(uid, {
          title: cleanTitle,
          content: cleanContent,
        });
      }

      closeModal();
    } catch (error) {
      console.error("Save note error:", error);

      Alert.alert(
        "Save Failed",
        "Unable to save your note. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (note) => {
    Alert.alert(
      "Delete Note",
      `Are you sure you want to delete "${note.title}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await removeUserNote(note.id);
            } catch (error) {
              console.error("Delete note error:", error);

              Alert.alert(
                "Delete Failed",
                "Unable to delete your note. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const renderNote = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.noteCard}
        activeOpacity={0.8}
        onPress={() => openEditNote(item)}
      >
        <View style={styles.noteContent}>
          <Text style={styles.noteTitle} numberOfLines={1}>
            {item.title}
          </Text>

          <Text style={styles.noteText} numberOfLines={3}>
            {item.content}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color="#D9534F"
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>My Notes</Text>

          <Text style={styles.subtitle}>
            Write down anything you want to{"\n"}remember.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={openCreateNote}
        >
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Notes */}
      {loading ? (
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading notes...</Text>
        </View>
      ) : notes.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons
            name="document-text-outline"
            size={64}
            color="#777777"
          />

          <Text style={styles.emptyTitle}>No notes yet</Text>

          <Text style={styles.emptyText}>
            Tap the + button to create your first note.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={renderNote}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingNote ? "Edit Note" : "New Note"}
              </Text>

              <TouchableOpacity
                onPress={closeModal}
                disabled={saving}
              >
                <Ionicons
                  name="close"
                  size={28}
                  color="#333333"
                />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.titleInput}
              placeholder="Note title"
              placeholderTextColor="#888888"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />

            <TextInput
              style={styles.contentInput}
              placeholder="Write your note here..."
              placeholderTextColor="#888888"
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              {editingNote && (
                <TouchableOpacity
                  style={styles.modalDeleteButton}
                  onPress={() => {
                    closeModal();
                    handleDelete(editingNote);
                  }}
                  disabled={saving}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color="#D9534F"
                  />

                  <Text style={styles.modalDeleteText}>
                    Delete
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  saving && styles.disabledButton,
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? "Saving..." : "Save Note"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FC",
  },

  header: {
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#17172A",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 19,
    color: "#777777",
  },

  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#5146E5",
    alignItems: "center",
    justifyContent: "center",
  },

  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },

  noteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E2E8",
    padding: 17,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  noteContent: {
    flex: 1,
    paddingRight: 12,
  },

  noteTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#292936",
    marginBottom: 8,
  },

  noteText: {
    fontSize: 15,
    lineHeight: 21,
    color: "#777777",
  },

  deleteButton: {
    padding: 5,
  },

  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 35,
    paddingBottom: 80,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 15,
    color: "#777777",
  },

  emptyTitle: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: "700",
    color: "#3A3A43",
  },

  emptyText: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
    color: "#888888",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 30,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#20202D",
  },

  titleInput: {
    borderWidth: 1,
    borderColor: "#DCDCE4",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    fontSize: 16,
    color: "#222222",
    marginBottom: 12,
  },

  contentInput: {
    borderWidth: 1,
    borderColor: "#DCDCE4",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingTop: 14,
    minHeight: 160,
    fontSize: 16,
    lineHeight: 22,
    color: "#222222",
  },

  modalActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    gap: 12,
  },

  modalDeleteButton: {
    height: 50,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0CACA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  modalDeleteText: {
    color: "#D9534F",
    fontWeight: "600",
    fontSize: 15,
  },

  saveButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#5146E5",
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  disabledButton: {
    opacity: 0.6,
  },
});