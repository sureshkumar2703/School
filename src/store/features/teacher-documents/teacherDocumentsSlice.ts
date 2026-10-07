
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface TeacherDocument {
  id: string;
  teacher_id: string;
  organization_key: string;
  doc_type: string;
  file_path: string;
  public_url: string;
  created_at?: string;
}

export interface FetchTeacherDocumentsPayload {
  teacherId: string;
  organizationKey: string;
}

export interface AddTeacherDocumentPayload {
  teacherId: string;
  docType: string;
  file: File;
  organizationKey: string;
}

export interface DeleteTeacherDocumentPayload {
  docId: string;
  filePath: string;
  organizationKey: string;
}


interface TeacherDocumentsState {
  documents: TeacherDocument[];
  loading: boolean;
  error: string | null;
}

const initialState: TeacherDocumentsState = {
  documents: [],
  loading: false,
  error: null,
};

const teacherDocumentsSlice = createSlice({
  name: 'teacherDocuments',
  initialState,
  reducers: {
    // Fetch
    fetchTeacherDocumentsRequest: (state, _action: PayloadAction<FetchTeacherDocumentsPayload>) => {
      state.loading = true;
      state.error = null;
      state.documents = []; // Clear previous teacher's documents
    },
    fetchTeacherDocumentsSuccess: (state, action: PayloadAction<TeacherDocument[]>) => {
      state.loading = false;
      state.documents = action.payload;
    },
    fetchTeacherDocumentsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Add
    addTeacherDocumentRequest: (state, _action: PayloadAction<AddTeacherDocumentPayload>) => {
      state.loading = true;
    },
    addTeacherDocumentSuccess: (state, action: PayloadAction<TeacherDocument>) => {
      state.loading = false;
      state.documents.push(action.payload);
    },
    addTeacherDocumentFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Delete
    deleteTeacherDocumentRequest: (state, _action: PayloadAction<DeleteTeacherDocumentPayload>) => {
      state.loading = true;
    },
    deleteTeacherDocumentSuccess: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.documents = state.documents.filter(doc => doc.id !== action.payload);
    },
    deleteTeacherDocumentFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchTeacherDocumentsRequest,
  fetchTeacherDocumentsSuccess,
  fetchTeacherDocumentsFailure,
  addTeacherDocumentRequest,
  addTeacherDocumentSuccess,
  addTeacherDocumentFailure,
  deleteTeacherDocumentRequest,
  deleteTeacherDocumentSuccess,
  deleteTeacherDocumentFailure,
} = teacherDocumentsSlice.actions;

export default teacherDocumentsSlice.reducer;
