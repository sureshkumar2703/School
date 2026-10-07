
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Circular {
    id: string;
    organization_key: string;
    title: string;
    content?: string;
    issue_date: string;
    audience: string[];
    file_url?: string;
    file_path?: string;
    status: string;
    created_at: string;
}

export interface AddCircularPayload {
    organization_key: string;
    title: string;
    content?: string;
    issue_date: string;
    audience: string[];
    status: string;
    file?: File;
}

export interface UpdateCircularPayload extends Partial<Omit<Circular, 'created_at' | 'id'>> {
  id: string;
  file?: File;
  old_file_path?: string | null;
}

export interface DeleteCircularPayload {
    circularId: string;
    filePath?: string | null;
}


interface CircularsState {
  circulars: Circular[];
  loading: boolean;
  error: string | null;
}

const initialState: CircularsState = {
  circulars: [],
  loading: false,
  error: null,
};

const circularsSlice = createSlice({
  name: 'circulars',
  initialState,
  reducers: {
    fetchCircularsRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchCircularsSuccess: (state, action: PayloadAction<Circular[]>) => {
      state.loading = false;
      state.circulars = action.payload;
    },
    fetchCircularsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    addCircularRequest: (state, _action: PayloadAction<AddCircularPayload>) => {
      state.loading = true;
    },
    addCircularSuccess: (state, action: PayloadAction<Circular>) => {
      state.loading = false;
      state.circulars.unshift(action.payload);
    },
    addCircularFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateCircularRequest: (state, _action: PayloadAction<UpdateCircularPayload>) => {
        state.loading = true;
    },
    updateCircularSuccess: (state, action: PayloadAction<Circular>) => {
        state.loading = false;
        const index = state.circulars.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
            state.circulars[index] = action.payload;
        }
    },
    updateCircularFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
    deleteCircularRequest: (state, _action: PayloadAction<DeleteCircularPayload>) => {
        state.loading = true;
    },
    deleteCircularSuccess: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.circulars = state.circulars.filter(c => c.id !== action.payload);
    },
    deleteCircularFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    }
  },
});

export const {
    fetchCircularsRequest,
    fetchCircularsSuccess,
    fetchCircularsFailure,
    addCircularRequest,
    addCircularSuccess,
    addCircularFailure,
    updateCircularRequest,
    updateCircularSuccess,
    updateCircularFailure,
    deleteCircularRequest,
    deleteCircularSuccess,
    deleteCircularFailure,
} = circularsSlice.actions;

export default circularsSlice.reducer;
