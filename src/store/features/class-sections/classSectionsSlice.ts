
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// Represents a single row in the new, normalized table
export interface ClassSectionAllocation {
  id: string;
  created_at: string;
  organization_key: string;
  academic_year: string;
  class_name: string;
  section_name: string;
  register_no: string;
  full_name: string;
}

export interface FetchAllocationsPayload {
  organizationKey: string;
  className: string;
  academicYear: string;
}

export interface UpdateAllocationPayload {
    id: string;
    section_name: string;
    organization_key: string;
}

interface ClassSectionsState {
  allocations: ClassSectionAllocation[];
  loading: boolean;
  error: string | null;
}

const initialState: ClassSectionsState = {
  allocations: [],
  loading: false,
  error: null,
};

const classSectionsSlice = createSlice({
  name: 'classSections',
  initialState,
  reducers: {
    // Save (Upsert) allocations
    saveClassSectionRequest: (state, _action: PayloadAction<Omit<ClassSectionAllocation, 'id' | 'created_at'>[]>) => {
      state.loading = true;
      state.error = null;
    },
    saveClassSectionSuccess: (state) => {
      state.loading = false;
    },
    saveClassSectionFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Fetch existing allocations
    fetchAllocationsRequest: (state, _action: PayloadAction<FetchAllocationsPayload>) => {
        state.loading = true;
        state.error = null;
    },
    fetchAllocationsSuccess: (state, action: PayloadAction<ClassSectionAllocation[]>) => {
        state.loading = false;
        state.allocations = action.payload;
    },
    fetchAllocationsFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },

    // Update single allocation
    updateAllocationRequest: (state, _action: PayloadAction<UpdateAllocationPayload>) => {
        state.loading = true;
        state.error = null;
    },
    updateAllocationSuccess: (state, action: PayloadAction<ClassSectionAllocation>) => {
        state.loading = false;
        const index = state.allocations.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
            state.allocations[index] = action.payload;
        }
    },
    updateAllocationFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
  },
});

export const {
  saveClassSectionRequest,
  saveClassSectionSuccess,
  saveClassSectionFailure,
  fetchAllocationsRequest,
  fetchAllocationsSuccess,
  fetchAllocationsFailure,
  updateAllocationRequest,
  updateAllocationSuccess,
  updateAllocationFailure,
} = classSectionsSlice.actions;

export default classSectionsSlice.reducer;
