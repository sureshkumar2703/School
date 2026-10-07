
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface FeeStructure {
    id: string;
    organization_key: string;
    academic_year: string;
    class_name: string;
    class_fees: number;
    status: 'Active' | 'Inactive';
    created_at?: string;
}

export type AddFeePayload = Omit<FeeStructure, 'id' | 'created_at'>;

interface SetFeesState {
  fees: FeeStructure[];
  loading: boolean;
  error: string | null;
}

const initialState: SetFeesState = {
  fees: [],
  loading: false,
  error: null,
};

const setfeesSlice = createSlice({
  name: 'setfees',
  initialState,
  reducers: {
    // Add Fee
    addFeeRequest: (state, _action: PayloadAction<AddFeePayload>) => {
      state.loading = true;
      state.error = null;
    },
    addFeeSuccess: (state) => {
      state.loading = false;
    },
    addFeeFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Fetch Fees
    fetchFeesRequest: (state, _action: PayloadAction<string>) => {
        state.loading = true;
        state.error = null;
    },
    fetchFeesSuccess: (state, action: PayloadAction<FeeStructure[]>) => {
        state.loading = false;
        state.fees = action.payload;
    },
    fetchFeesFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
    // Update Fee
    updateFeeRequest: (state, _action: PayloadAction<Partial<FeeStructure> & { id: string }>) => {
      state.loading = true;
    },
    updateFeeSuccess: (state) => {
      state.loading = false;
    },
    updateFeeFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Delete Fee
    deleteFeeRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
    },
    deleteFeeSuccess: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.fees = state.fees.filter(fee => fee.id !== action.payload);
    },
    deleteFeeFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  addFeeRequest,
  addFeeSuccess,
  addFeeFailure,
  fetchFeesRequest,
  fetchFeesSuccess,
  fetchFeesFailure,
  updateFeeRequest,
  updateFeeSuccess,
  updateFeeFailure,
  deleteFeeRequest,
  deleteFeeSuccess,
  deleteFeeFailure,
} = setfeesSlice.actions;

export default setfeesSlice.reducer;
