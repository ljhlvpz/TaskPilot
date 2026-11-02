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
  ActivityIndicator,
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
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

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
        setErrorMessage("");
        setLoading(false);
      },
      (error) => {
        console.error("Note listener error:", error);
        setLoading(false);
        setErrorMessage("Unable to load your notes. Please check your connection.");
      }
    );

    return unsubscribe;
  }, []);

  // =========================================
  // CREATE NOTE
  // =========================================

  const openCreateNote = () => {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setModalVisible(true);
  };

  // =========================================
  // EDIT NOTE
  // =========================================

  const openEditNote = (note) => {
    setEditingNote(note);
    setTitle(note.title || "");
    setContent(note.content || "");
    setModalVisible(true);
  };

  // =========================================
  // CLOSE MODAL
  // =========================================

  const closeModal = () => {
    if (saving) return;

    setModalVisible(false);
    setEditingNote(null);
    setTitle("");
    setContent("");
  };

  // =========================================
  // SAVE NOTE
  // =========================================

  const handleSave = async () => {
    if (saving) return;
    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle) {
      Alert.alert(
        "Missing Title",
        "Please enter a title for your note."
      );
      return;
    }

    if (!cleanContent) {
      Alert.alert(
        "Missing Content",
        "Please enter some note content."
      );
      return;
    }

    const uid = auth.currentUser?.uid;

    if (!uid) {
      Alert.alert(
        "Not Signed In",
        "Please sign in again."
      );
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

      setModalVisible(false);
      setEditingNote(null);
      setTitle("");
      setContent("");
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

  // =========================================
  // DELETE NOTE
  // =========================================

  const handleDelete = (note) => {
    if (deletingId) return;
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
              setDeletingId(note.id);
              await removeUserNote(note.id);
            } catch (error) {
              console.error(
                "Delete note error:",
                error
              );

              Alert.alert(
                "Delete Failed",
                "Unable to delete your note. Please try again."
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // =========================================
  // NOTE CARD
  // =========================================

  const renderNote = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.noteCard}
        activeOpacity={0.8}
        onPress={() => openEditNote(item)}
      >
        <View style={styles.noteContent}>
          <Text
            style={styles.noteTitle}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          <Text
            style={styles.noteText}
            numberOfLines={3}
          >
            {item.content}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
          disabled={deletingId !== null}
          hitSlop={{
            top: 10,
            bottom: 10,
            left: 10,
            right: 10,
          }}
        >
          {deletingId === item.id ? (
            <ActivityIndicator size="small" color={Theme.colors.error} />
          ) : (
            <Ionicons name="trash-outline" size={20} color={Theme.colors.error} />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // =========================================
  // UI
  // =========================================

  return (
    <View style={styles.container}>

      {/* =====================================
          HEADER
      ===================================== */}

      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>
            My Notes
          </Text>

          <Text style={styles.subtitle}>
            Write down anything you want to{"\n"}
            remember.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={openCreateNote}
        >
          <Ionicons
            name="add"
            size={32}
            color={Theme.colors.surface}
          />
        </TouchableOpacity>
      </View>


      {/* =====================================
          NOTES
      ===================================== */}

      {loading ? (
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>
            Loading notes...
          </Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={Theme.colors.error} />
          <Text style={styles.emptyText}>{errorMessage}</Text>
        </View>
      ) : notes.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons
            name="document-text-outline"
            size={64}
            color={Theme.colors.primary}
          />

          <Text style={styles.emptyTitle}>
            No notes yet
          </Text>

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


      {/* =====================================
          CREATE / EDIT MODAL
      ===================================== */}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : "height"
          }
        >
          <View style={styles.modalContainer}>

            {/* MODAL HEADER */}

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingNote
                  ? "Edit Note"
                  : "New Note"}
              </Text>

              <TouchableOpacity
                onPress={closeModal}
                disabled={saving}
              >
                <Ionicons
                  name="close"
                  size={28}
                  color={Theme.colors.text}
                />
              </TouchableOpacity>
            </View>


            {/* TITLE */}

            <TextInput
              style={styles.titleInput}
              placeholder="Note title"
              placeholderTextColor={
                Theme.colors.secondaryText
              }
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />


            {/* CONTENT */}

            <TextInput
              style={styles.contentInput}
              placeholder="Write your note here..."
              placeholderTextColor={
                Theme.colors.secondaryText
              }
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />


            {/* ACTIONS */}

            <View style={styles.modalActions}>

              {editingNote && (
                <TouchableOpacity
                  style={styles.modalDeleteButton}
                  onPress={() => {
                    closeModal();
                    handleDelete(editingNote);
                  }}
                  disabled={saving || deletingId !== null}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={Theme.colors.error}
                  />

                  <Text
                    style={styles.modalDeleteText}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  saving &&
                    styles.disabledButton,
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text
                  style={styles.saveButtonText}
                >
                  {saving
                    ? "Saving..."
                    : "Save Note"}
                </Text>
              </TouchableOpacity>

            </View>

          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}


// =============================================
// STYLES
// =============================================

const styles = StyleSheet.create({

  // -----------------------------------------
  // SCREEN
  // -----------------------------------------

  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },


  // -----------------------------------------
  // HEADER
  // -----------------------------------------

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
    color: Theme.colors.text,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 19,
    color: Theme.colors.secondaryText,
  },

  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,

    backgroundColor: Theme.colors.primary,

    alignItems: "center",
    justifyContent: "center",
  },


  // -----------------------------------------
  // LIST
  // -----------------------------------------

  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },

  noteCard: {
    backgroundColor: Theme.colors.surface,

    borderRadius: 15,
    borderWidth: 1,
    borderColor: Theme.colors.border,

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
    color: Theme.colors.text,
    marginBottom: 8,
  },

  noteText: {
    fontSize: 15,
    lineHeight: 21,
    color: Theme.colors.secondaryText,
  },

  deleteButton: {
    padding: 5,
  },


  // -----------------------------------------
  // EMPTY / LOADING
  // -----------------------------------------

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
    color: Theme.colors.secondaryText,
  },

  emptyTitle: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: "700",
    color: Theme.colors.text,
  },

  emptyText: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
    color: Theme.colors.secondaryText,
  },


  // -----------------------------------------
  // MODAL
  // -----------------------------------------

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: Theme.colors.surface,

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
    color: Theme.colors.text,
  },


  // -----------------------------------------
  // MODAL INPUTS
  // -----------------------------------------

  titleInput: {
    borderWidth: 1,
    borderColor: Theme.colors.border,

    borderRadius: 12,

    paddingHorizontal: 15,
    height: 50,

    fontSize: 16,
    color: Theme.colors.text,

    marginBottom: 12,
  },

  contentInput: {
    borderWidth: 1,
    borderColor: Theme.colors.border,

    borderRadius: 12,

    paddingHorizontal: 15,
    paddingTop: 14,

    minHeight: 160,

    fontSize: 16,
    lineHeight: 22,

    color: Theme.colors.text,
  },


  // -----------------------------------------
  // MODAL ACTIONS
  // -----------------------------------------

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

    borderColor: Theme.colors.error,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 7,
  },

  modalDeleteText: {
    color: Theme.colors.error,
    fontWeight: "600",
    fontSize: 15,
  },

  saveButton: {
    flex: 1,

    height: 50,
    borderRadius: 12,

    backgroundColor: Theme.colors.primary,

    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonText: {
    color: Theme.colors.surface,
    fontSize: 16,
    fontWeight: "700",
  },

  disabledButton: {
    opacity: 0.6,
  },

});