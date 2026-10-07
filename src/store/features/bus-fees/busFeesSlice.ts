import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface BusFeeSetup {
    id: string;
    organization_key: string;
    academic_year: string;
    bus_id: string;
    bus_number: string;
    fees: number;
    status: 'Active' | 'Inactive';
    created_at?: string;
}

export type AddBusFeePayload = Omit<BusFeeSetup, 'id' | 'created_at'>;

interface BusFeesState {
    busFees: BusFeeSetup[];
    loading: boolean;
    error: string | null;
}

const initialState: BusFeesState = {
    busFees: [],
    loading: false,
    error: null,
};

const busFeesSlice = createSlice({
    name: 'busFees',
    initialState,
    reducers: {
        // Fetch
        fetchBusFeesRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
            state.error = null;
        },
        fetchBusFeesSuccess: (state, action: PayloadAction<BusFeeSetup[]>) => {
            state.loading = false;
            state.busFees = action.payload;
        },
        fetchBusFeesFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Save (Add or Update)
        saveBusFeeRequest: (state, _action: PayloadAction<AddBusFeePayload>) => {
            state.loading = true;
            state.error = null;
        },
        saveBusFeeSuccess: (state) => {
            state.loading = false;
        },
        saveBusFeeFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Update Status
        updateBusFeeStatusRequest: (state, _action: PayloadAction<{ id: string; status: 'Active' | 'Inactive' }>) => {
            state.loading = true;
        },
        updateBusFeeStatusSuccess: (state) => {
            state.loading = false;
        },
        updateBusFeeStatusFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Delete
        deleteBusFeeRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
        },
        deleteBusFeeSuccess: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.busFees = state.busFees.filter(bf => bf.id !== action.payload);
        },
        deleteBusFeeFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
    },
});

export const {
    fetchBusFeesRequest,
    fetchBusFeesSuccess,
    fetchBusFeesFailure,
    saveBusFeeRequest,
    saveBusFeeSuccess,
    saveBusFeeFailure,
    updateBusFeeStatusRequest,
    updateBusFeeStatusSuccess,
    updateBusFeeStatusFailure,
    deleteBusFeeRequest,
    deleteBusFeeSuccess,
    deleteBusFeeFailure,
} = busFeesSlice.actions;

export default busFeesSlice.reducer;
