
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ClassNote {
  id: string;
  created_at: string;
  teacher_id: string;
  organization_key: string;
  class_name: string;
  section_name: string;
  academic_year: string;
  subject: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_type: string;
  teacher_name?: string; // Add optional teacher_name
  staff_code?: string; // Add optional staff_code
}

export interface FetchNotesPayload {
    teacherId: string;
    className: string;
    sectionName: string;
    academicYear: string;
    subject: string;
}

export interface AddNotePayload extends Omit<ClassNote, 'id' | 'created_at' | 'file_name' | 'file_path' | 'file_url' | 'file_type'> {
    file: File;
}

export interface DeleteNotePayload {
    noteId: string;
    filePath: string;
}

interface NotesState {
  notes: ClassNote[];
  loading: boolean;
  error: string | null;
}

const initialState: NotesState = {
  notes: [],
  loading: false,
  error: null,
};

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    // Fetch
    fetchNotesRequest: (state, _action: PayloadAction<FetchNotesPayload>) => {
      state.loading = true;
      state.error = null;
    },
    fetchNotesSuccess: (state, action: PayloadAction<ClassNote[]>) => {
      state.loading = false;
      state.notes = action.payload;
    },
    fetchNotesFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Add
    addNoteRequest: (state, _action: PayloadAction<AddNotePayload>) => {
      state.loading = true;
    },
    addNoteSuccess: (state, action: PayloadAction<ClassNote>) => {
      state.loading = false;
      state.notes.unshift(action.payload);
    },
    addNoteFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Delete
    deleteNoteRequest: (state, _action: PayloadAction<DeleteNotePayload>) => {
      state.loading = true;
    },
    deleteNoteSuccess: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.notes = state.notes.filter(note => note.id !== action.payload);
    },
    deleteNoteFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchNotesRequest,
  fetchNotesSuccess,
  fetchNotesFailure,
  addNoteRequest,
  addNoteSuccess,
  addNoteFailure,
  deleteNoteRequest,
  deleteNoteSuccess,
  deleteNoteFailure,
} = notesSlice.actions;

export default notesSlice.reducer;

    
