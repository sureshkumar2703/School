
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface StudentTransportAllocation {
    id: string;
    organization_key: string;
    student_id: string;
    academic_year: string;
    class_name: string;
    section_name: string;
    register_no?: string;
    roll_no?: string;
    full_name?: string;
    permanent_address?: string;
    temporary_address?: string;
    status: 'Active' | 'Inactive';
    bus_id?: string;
}

export interface UpdateStatusPayload {
    id: string;
    status: 'Active' | 'Inactive';
    organization_key: string;
}

interface StudentTransportState {
  allocations: StudentTransportAllocation[];
  loading: boolean;
  error: string | null;
}

const initialState: StudentTransportState = {
  allocations: [],
  loading: false,
  error: null,
};

const studentTransportSlice = createSlice({
  name: 'studentTransport',
  initialState,
  reducers: {
    assignTransportRequest: (state, _action: PayloadAction<Omit<StudentTransportAllocation, 'id'>[]>) => {
      state.loading = true;
      state.error = null;
    },
    assignTransportSuccess: (state) => {
      state.loading = false;
    },
    assignTransportFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    
    // Fetch
    fetchAllocationsRequest: (state, _action: PayloadAction<string>) => {
        state.loading = true;
        state.error = null;
    },
    fetchAllocationsSuccess: (state, action: PayloadAction<StudentTransportAllocation[]>) => {
        state.loading = false;
        state.allocations = action.payload;
    },
    fetchAllocationsFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },

    // Update Status
    updateAllocationStatusRequest: (state, _action: PayloadAction<UpdateStatusPayload>) => {
        state.loading = true;
    },
    updateAllocationStatusSuccess: (state, action: PayloadAction<StudentTransportAllocation>) => {
        state.loading = false;
        const index = state.allocations.findIndex(alloc => alloc.id === action.payload.id);
        if (index !== -1) {
            state.allocations[index] = action.payload;
        }
    },
    updateAllocationStatusFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },

    // Delete Allocation
    deleteAllocationRequest: (state, _action: PayloadAction<string>) => {
        state.loading = true;
    },
    deleteAllocationSuccess: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.allocations = state.allocations.filter(alloc => alloc.id !== action.payload);
    },
    deleteAllocationFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
  },
});

export const {
  assignTransportRequest,
  assignTransportSuccess,
  assignTransportFailure,
  fetchAllocationsRequest,
  fetchAllocationsSuccess,
  fetchAllocationsFailure,
  updateAllocationStatusRequest,
  updateAllocationStatusSuccess,
  updateAllocationStatusFailure,
  deleteAllocationRequest,
  deleteAllocationSuccess,
  deleteAllocationFailure,
} = studentTransportSlice.actions;

export default studentTransportSlice.reducer;
