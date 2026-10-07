
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Regulation {
    id: string;
    created_at: string;
    organization_key: string;
    academic_year: string;
    class: string;
    regulation: string;
    status: string;
}

export type AddRegulationPayload = Omit<Regulation, 'id' | 'created_at'>;

interface SetRegulationState {
  regulations: Regulation[];
  loading: boolean;
  error: string | null;
}

const initialState: SetRegulationState = {
  regulations: [],
  loading: false,
  error: null,
};

const setRegulationSlice = createSlice({
  name: 'setRegulation',
  initialState,
  reducers: {
    fetchRegulationsRequest: (state, _action: PayloadAction<string>) => {
        state.loading = true;
        state.error = null;
    },
    fetchRegulationsSuccess: (state, action: PayloadAction<Regulation[]>) => {
        state.loading = false;
        state.regulations = action.payload;
    },
    fetchRegulationsFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
    addRegulationRequest: (state, _action: PayloadAction<AddRegulationPayload>) => {
        state.loading = true;
    },
    addRegulationSuccess: (state) => {
        state.loading = false;
    },
    addRegulationFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
    bulkAddRegulationsRequest: (state, _action: PayloadAction<AddRegulationPayload[]>) => {
        state.loading = true;
    },
    bulkAddRegulationsSuccess: (state) => {
        state.loading = false;
    },
    bulkAddRegulationsFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
    // Update
    updateRegulationRequest: (state, _action: PayloadAction<Partial<Regulation> & { id: string }>) => {
        state.loading = true;
    },
    updateRegulationSuccess: (state) => {
        state.loading = false;
    },
    updateRegulationFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
    // Delete
    deleteRegulationRequest: (state, _action: PayloadAction<string>) => {
        state.loading = true;
    },
    deleteRegulationSuccess: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.regulations = state.regulations.filter(r => r.id !== action.payload);
    },
    deleteRegulationFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
  },
});

export const { 
    fetchRegulationsRequest,
    fetchRegulationsSuccess,
    fetchRegulationsFailure,
    addRegulationRequest,
    addRegulationSuccess,
    addRegulationFailure,
    bulkAddRegulationsRequest,
    bulkAddRegulationsSuccess,
    bulkAddRegulationsFailure,
    updateRegulationRequest,
    updateRegulationSuccess,
    updateRegulationFailure,
    deleteRegulationRequest,
    deleteRegulationSuccess,
    deleteRegulationFailure,
} = setRegulationSlice.actions;

export default setRegulationSlice.reducer;
