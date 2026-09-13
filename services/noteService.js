import {
  createNote,
  subscribeToUserNotes,
  updateNote,
  deleteNote,
} from "../firebase/firestore";


// Create a note for the logged-in user
export const addUserNote = async (uid, noteData) => {
  return createNote(uid, noteData);
};


// Listen to the logged-in user's notes
export const listenToUserNotes = (uid, onNotesChanged, onError) => {
  return subscribeToUserNotes(uid, onNotesChanged, onError);
};


// Update an existing note
export const editUserNote = async (noteId, updatedNoteData) => {
  return updateNote(noteId, updatedNoteData);
};


// Delete a note
export const removeUserNote = async (noteId) => {
  if (!noteId) {
    throw new Error("Note ID is required.");
  }

  return deleteNote(noteId);
};