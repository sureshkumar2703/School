
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Organization {
  id: string;
  name: string;
  organization_key: string;
  start_date: string;
  expire_date: string;
  status: string; // "Active", "Inactive", etc.
  created_at?: string;
}

interface OrganizationsState {
  organizations: Organization[];
  loading: boolean;
  error: string | null;
}

const initialState: OrganizationsState = {
  organizations: [],
  loading: false,
  error: null,
};

const organizationsSlice = createSlice({
  name: 'organizations',
  initialState,
  reducers: {
    // Fetch
    fetchOrganizationsRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchOrganizationsSuccess: (state, action: PayloadAction<Organization[]>) => {
      state.loading = false;
      state.organizations = action.payload;
    },
    fetchOrganizationsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Add
    addOrganizationRequest: (state, _action: PayloadAction<Omit<Organization, 'id' | 'created_at'>>) => {
      state.loading = true;
    },
    addOrganizationSuccess: (state) => {
      state.loading = false;
    },
    addOrganizationFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Update
    updateOrganizationRequest: (state, _action: PayloadAction<Organization>) => {
      state.loading = true;
    },
    updateOrganizationSuccess: (state) => {
      state.loading = false;
    },
    updateOrganizationFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Delete
    deleteOrganizationRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
    },
    deleteOrganizationSuccess: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.organizations = state.organizations.filter(org => org.id !== action.payload);
    },
    deleteOrganizationFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // This was for the real-time updates, which is now handled by re-fetching.
    // setOrganizations is no longer needed.
  },
});

export const {
  fetchOrganizationsRequest,
  fetchOrganizationsSuccess,
  fetchOrganizationsFailure,
  addOrganizationRequest,
  addOrganizationSuccess,
  addOrganizationFailure,
  updateOrganizationRequest,
  updateOrganizationSuccess,
  updateOrganizationFailure,
  deleteOrganizationRequest,
  deleteOrganizationSuccess,
  deleteOrganizationFailure,
} = organizationsSlice.actions;

export default organizationsSlice.reducer;
