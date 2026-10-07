
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AdminData {
  id: string;
  name: string;
  phone: string;
  email: string;
  password?: string; // It's not recommended to handle passwords in the frontend
  organization_key: string;
  status: 'Active' | 'Inactive';
  created_at: string;
}

interface OrganizationsAdminsState {
  admins: AdminData[];
  loading: boolean;
  error: string | null;
}

const initialState: OrganizationsAdminsState = {
  admins: [],
  loading: false,
  error: null,
};

const organizationsAdminsSlice = createSlice({
  name: 'organizationsAdmins',
  initialState,
  reducers: {
    fetchAdminsRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
      state.admins = [];
    },
    fetchAdminsSuccess: (state, action: PayloadAction<AdminData[]>) => {
      state.loading = false;
      state.admins = action.payload;
    },
    fetchAdminsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateAdminStatusRequest: (state, _action: PayloadAction<AdminData>) => {
        state.loading = true;
    },
    updateAdminStatusSuccess: (state, action: PayloadAction<AdminData>) => {
        state.loading = false;
        const index = state.admins.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
            state.admins[index] = action.payload;
        }
    },
    updateAdminStatusFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
  },
});

export const {
  fetchAdminsRequest,
  fetchAdminsSuccess,
  fetchAdminsFailure,
  updateAdminStatusRequest,
  updateAdminStatusSuccess,
  updateAdminStatusFailure,
} = organizationsAdminsSlice.actions;

export default organizationsAdminsSlice.reducer;
