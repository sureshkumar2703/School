
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface SchoolDetails {
    id: string;
    organization_key: string;
    admin_id?: string; // ID of the admin who saved the details
    school_name: string;
    address: string;
    map_address?: string; // New field for the map location
    phone_number: string;
    email: string;
    website?: string;
    principal_name: string;
    established_year: number;
    school_type: 'Public' | 'Private' | 'International';
    affiliation: 'CBSE' | 'ICSE' | 'State Board' | 'IB' | 'Other';
    tagline?: string;
    about_school?: string;
    logo_url?: string;
    logo_path?: string;
    created_at?: string;
}

export interface SaveDetailsPayload {
    details: Partial<Omit<SchoolDetails, 'created_at'>>;
    logoFile?: File;
    logo_path?: string | null;
}

interface SchoolDetailsState {
    details: SchoolDetails | null;
    loading: boolean;
    error: string | null;
}

const initialState: SchoolDetailsState = {
    details: null,
    loading: false,
    error: null,
};

const schoolDetailsSlice = createSlice({
    name: 'schoolDetails',
    initialState,
    reducers: {
        // Fetch
        fetchSchoolDetailsRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
            state.error = null;
        },
        fetchSchoolDetailsSuccess: (state, action: PayloadAction<SchoolDetails | null>) => {
            state.loading = false;
            state.details = action.payload;
        },
        fetchSchoolDetailsFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },

        // Save (Create/Update)
        saveSchoolDetailsRequest: (state, _action: PayloadAction<SaveDetailsPayload>) => {
            state.loading = true;
            state.error = null;
        },
        saveSchoolDetailsSuccess: (state, action: PayloadAction<SchoolDetails>) => {
            state.loading = false;
            state.details = action.payload;
        },
        saveSchoolDetailsFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
    },
});

export const {
    fetchSchoolDetailsRequest,
    fetchSchoolDetailsSuccess,
    fetchSchoolDetailsFailure,
    saveSchoolDetailsRequest,
    saveSchoolDetailsSuccess,
    saveSchoolDetailsFailure,
} = schoolDetailsSlice.actions;

export default schoolDetailsSlice.reducer;
