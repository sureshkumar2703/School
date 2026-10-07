
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Driver {
    id: string;
    organization_key: string;
    full_name: string;
    dob?: string;
    gender?: 'Male' | 'Female' | 'Other';
    phone_number: string;
    email?: string;
    address?: string;
    license_number: string;
    license_expiry_date?: string;
    driving_experience?: number;
    vehicle_type?: string[];
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    profile_photo_url?: string;
    profile_photo_path?: string;
    id_proof_url?: string;
    id_proof_path?: string;
    status?: 'Active' | 'Inactive';
    created_at?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AddDriverPayload extends Omit<Driver, 'id' | 'created_at' | 'profile_photo_url' | 'profile_photo_path' | 'id_proof_url' | 'id_proof_path'> {
    profile_photo_file?: File;
    id_proof_file?: File;
}

export interface DeleteDriverPayload {
    driverId: string;
    photoPath?: string;
    idProofPath?: string;
}

interface DriversState {
    drivers: Driver[];
    loading: boolean;
    error: string | null;
}

const initialState: DriversState = {
    drivers: [],
    loading: false,
    error: null,
};

const driversSlice = createSlice({
    name: 'drivers',
    initialState,
    reducers: {
        // Fetch
        fetchDriversRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
            state.error = null;
        },
        fetchDriversSuccess: (state, action: PayloadAction<Driver[]>) => {
            state.loading = false;
            state.drivers = action.payload;
        },
        fetchDriversFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Add
        addDriverRequest: (state, _action: PayloadAction<AddDriverPayload>) => {
            state.loading = true;
            state.error = null;
        },
        addDriverSuccess: (state) => {
            state.loading = false;
        },
        addDriverFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Update
        updateDriverRequest: (state, _action: PayloadAction<Partial<Driver> & { id: string }>) => {
            state.loading = true;
            state.error = null;
        },
        updateDriverSuccess: (state) => {
            state.loading = false;
        },
        updateDriverFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Delete
        deleteDriverRequest: (state, _action: PayloadAction<DeleteDriverPayload>) => {
            state.loading = true;
            state.error = null;
        },
        deleteDriverSuccess: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.drivers = state.drivers.filter(d => d.id !== action.payload);
        },
        deleteDriverFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
    },
});

export const {
    fetchDriversRequest,
    fetchDriversSuccess,
    fetchDriversFailure,
    addDriverRequest,
    addDriverSuccess,
    addDriverFailure,
    updateDriverRequest,
    updateDriverSuccess,
    updateDriverFailure,
    deleteDriverRequest,
    deleteDriverSuccess,
    deleteDriverFailure,
} = driversSlice.actions;

export default driversSlice.reducer;
