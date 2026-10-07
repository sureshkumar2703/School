
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface BusDriverAllocation {
    id: string;
    organization_key: string;
    bus_id: string;
    driver_id: string;
    bus_number: string;
    vehicle_number?: string;
    seating_capacity?: number;
    route_address?: string;
    full_name: string; // driver's full_name
    phone_number: string; // driver's phone_number
    created_at?: string;
}

export type CreateAllocationPayload = Omit<BusDriverAllocation, 'id' | 'created_at'>;

interface BusDriverAllocationState {
    allocations: BusDriverAllocation[];
    loading: boolean;
    error: string | null;
}

const initialState: BusDriverAllocationState = {
    allocations: [],
    loading: false,
    error: null,
};

const busDriverAllocationSlice = createSlice({
    name: 'busDriverAllocations',
    initialState,
    reducers: {
        // Create
        createAllocationRequest: (state, _action: PayloadAction<CreateAllocationPayload>) => {
            state.loading = true;
            state.error = null;
        },
        createAllocationSuccess: (state) => {
            state.loading = false;
        },
        createAllocationFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Fetch
        fetchAllocationsRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
            state.error = null;
        },
        fetchAllocationsSuccess: (state, action: PayloadAction<BusDriverAllocation[]>) => {
            state.loading = false;
            state.allocations = action.payload;
        },
        fetchAllocationsFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Delete
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
    createAllocationRequest,
    createAllocationSuccess,
    createAllocationFailure,
    fetchAllocationsRequest,
    fetchAllocationsSuccess,
    fetchAllocationsFailure,
    deleteAllocationRequest,
    deleteAllocationSuccess,
    deleteAllocationFailure,
} = busDriverAllocationSlice.actions;

export default busDriverAllocationSlice.reducer;
