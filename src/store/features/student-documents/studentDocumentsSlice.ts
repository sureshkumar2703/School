
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface StudentDocument {
  id: string;
  student_id: string;
  organization_key: string;
  doc_type: string;
  file_path: string;
  public_url: string;
  created_at?: string;
}

export interface FetchDocumentsPayload {
  studentId: string;
  organizationKey: string;
}

export interface AddDocumentPayload {
  studentId: string;
  docType: string;
  file: File;
  organizationKey: string;
}

export interface DeleteDocumentPayload {
  docId: string;
  filePath: string;
  organizationKey: string;
}


interface StudentDocumentsState {
  documents: StudentDocument[];
  loading: boolean;
  error: string | null;
}

const initialState: StudentDocumentsState = {
  documents: [],
  loading: false,
  error: null,
};

const studentDocumentsSlice = createSlice({
  name: 'studentDocuments',
  initialState,
  reducers: {
    // Fetch
    fetchDocumentsRequest: (state, _action: PayloadAction<FetchDocumentsPayload>) => {
      state.loading = true;
      state.error = null;
      state.documents = []; // Clear previous student's documents
    },
    fetchDocumentsSuccess: (state, action: PayloadAction<StudentDocument[]>) => {
      state.loading = false;
      state.documents = action.payload;
    },
    fetchDocumentsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Add
    addDocumentRequest: (state, _action: PayloadAction<AddDocumentPayload>) => {
      state.loading = true;
    },
    addDocumentSuccess: (state, action: PayloadAction<StudentDocument>) => {
      state.loading = false;
      state.documents.push(action.payload);
    },
    addDocumentFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Delete
    deleteDocumentRequest: (state, _action: PayloadAction<DeleteDocumentPayload>) => {
      state.loading = true;
    },
    deleteDocumentSuccess: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.documents = state.documents.filter(doc => doc.id !== action.payload);
    },
    deleteDocumentFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchDocumentsRequest,
  fetchDocumentsSuccess,
  fetchDocumentsFailure,
  addDocumentRequest,
  addDocumentSuccess,
  addDocumentFailure,
  deleteDocumentRequest,
  deleteDocumentSuccess,
  deleteDocumentFailure,
} = studentDocumentsSlice.actions;

export default studentDocumentsSlice.reducer;
