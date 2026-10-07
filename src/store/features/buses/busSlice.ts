
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Bus {
    id: string;
    organization_key: string;
    vehicle_number: string;
    bus_number: string;
    registration_number?: string;
    route_address?: string;
    bus_model?: string;
    seating_capacity?: number;
    year_of_manufacture?: number;
    fuel_type?: 'Diesel' | 'Petrol' | 'CNG' | 'Electric';
    chassis_number?: string;
    engine_number?: string;
    color?: string;
    insurance_expiry_date?: string;
    permit_expiry_date?: string;
    fitness_certificate_expiry_date?: string;
    status: 'Active' | 'Inactive' | 'Under Maintenance';
    created_at?: string;
}

export type AddBusPayload = Omit<Bus, 'id' | 'created_at'>;

interface BusesState {
    buses: Bus[];
    loading: boolean;
    error: string | null;
}

const initialState: BusesState = {
    buses: [],
    loading: false,
    error: null,
};

const busSlice = createSlice({
    name: 'buses',
    initialState,
    reducers: {
        // Fetch
        fetchBusesRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
            state.error = null;
        },
        fetchBusesSuccess: (state, action: PayloadAction<Bus[]>) => {
            state.loading = false;
            state.buses = action.payload;
        },
        fetchBusesFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Add
        addBusRequest: (state, _action: PayloadAction<AddBusPayload>) => {
            state.loading = true;
        },
        addBusSuccess: (state) => {
            state.loading = false;
        },
        addBusFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Update
        updateBusRequest: (state, _action: PayloadAction<Partial<Bus> & { id: string }>) => {
            state.loading = true;
        },
        updateBusSuccess: (state) => {
            state.loading = false;
        },
        updateBusFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Delete
        deleteBusRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
        },
        deleteBusSuccess: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.buses = state.buses.filter(b => b.id !== action.payload);
        },
        deleteBusFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
    },
});

export const {
    fetchBusesRequest,
    fetchBusesSuccess,
    fetchBusesFailure,
    addBusRequest,
    addBusSuccess,
    addBusFailure,
    updateBusRequest,
    updateBusSuccess,
    updateBusFailure,
    deleteBusRequest,
    deleteBusSuccess,
    deleteBusFailure,
} = busSlice.actions;

export default busSlice.reducer;
