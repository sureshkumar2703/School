
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface LibraryStaff {
    id: string; // Will be the auth.users.id
    organization_key: string;
    staff_id: string;
    full_name: string;
    email: string;
    password?: string;
    gender?: string;
    dob?: string;
    age?: number;
    qualification?: string;
    experience?: number;
    joining_date?: string;
    employment_type?: string;
    phone_number?: string;
    emergency_number?: string;
    address?: string;
    photo_url?: string;
    photo_path?: string;
    status?: 'Active' | 'Inactive';
    created_at?: string;
}

// Payload for adding a staff member, includes the password and photo file
export interface AddStaffPayload extends Omit<LibraryStaff, 'id' | 'created_at' | 'photo_url' | 'photo_path'> {
    password?: string;
    photoFile?: File;
}

export interface UpdateStaffPayload {
    details: Partial<LibraryStaff> & { id: string };
    photoFile?: File;
    oldPhotoPath?: string | null;
}

export interface DeleteStaffPayload {
    staffId: string;
    photoPath?: string;
    organizationKey: string;
}


interface LibraryStaffState {
    staff: LibraryStaff[];
    loading: boolean;
    error: string | null;
}

const initialState: LibraryStaffState = {
    staff: [],
    loading: false,
    error: null,
};

const libraryStaffSlice = createSlice({
    name: 'libraryStaff',
    initialState,
    reducers: {
        // Fetch
        fetchStaffRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
            state.error = null;
        },
        fetchStaffSuccess: (state, action: PayloadAction<LibraryStaff[]>) => {
            state.loading = false;
            state.staff = action.payload;
        },
        fetchStaffFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Add
        addStaffRequest: (state, _action: PayloadAction<AddStaffPayload>) => {
            state.loading = true;
        },
        addStaffSuccess: (state) => {
            state.loading = false;
        },
        addStaffFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Update
        updateStaffRequest: (state, _action: PayloadAction<UpdateStaffPayload>) => {
            state.loading = true;
        },
        updateStaffSuccess: (state) => {
            state.loading = false;
        },
        updateStaffFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Delete
        deleteStaffRequest: (state, _action: PayloadAction<DeleteStaffPayload>) => {
            state.loading = true;
        },
        deleteStaffSuccess: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.staff = state.staff.filter(s => s.id !== action.payload);
        },
        deleteStaffFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
    },
});

export const {
    fetchStaffRequest,
    fetchStaffSuccess,
    fetchStaffFailure,
    addStaffRequest,
    addStaffSuccess,
    addStaffFailure,
    updateStaffRequest,
    updateStaffSuccess,
    updateStaffFailure,
    deleteStaffRequest,
    deleteStaffSuccess,
    deleteStaffFailure,
} = libraryStaffSlice.actions;

export default libraryStaffSlice.reducer;
