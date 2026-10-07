

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface UnitMark {
    id: string;
    organization_key: string;
    staff_code: string;
    class: string;
    section: string;
    academic_year: string;
    subject: string;
    regulation: string;
    unit: number;
    mark_type: number;
    status: 'Active' | 'Inactive';
    created_at?: string;
}

export type AddUnitMarkPayload = Omit<UnitMark, 'id' | 'created_at'>;

interface SetUnitMarkState {
    unitMarks: UnitMark[];
    loading: boolean;
    error: string | null;
}

const initialState: SetUnitMarkState = {
    unitMarks: [],
    loading: false,
    error: null,
};

const setUnitMarkSlice = createSlice({
    name: 'setUnitMark',
    initialState,
    reducers: {
        addUnitMarkRequest: (state, _action: PayloadAction<AddUnitMarkPayload>) => {
            state.loading = true;
            state.error = null;
        },
        addUnitMarkSuccess: (state) => {
            state.loading = false;
        },
        addUnitMarkFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        fetchUnitMarksRequest: (state, _action: PayloadAction<{ organizationKey: string; staffCode: string }>) => {
            state.loading = true;
            state.error = null;
        },
        fetchUnitMarksSuccess: (state, action: PayloadAction<UnitMark[]>) => {
            state.loading = false;
            state.unitMarks = action.payload;
        },
        fetchUnitMarksFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        deleteUnitMarkRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
        },
        deleteUnitMarkSuccess: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.unitMarks = state.unitMarks.filter(um => um.id !== action.payload);
        },
        deleteUnitMarkFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        bulkAddUnitMarksRequest: (state, _action: PayloadAction<AddUnitMarkPayload[]>) => {
            state.loading = true;
        },
        bulkAddUnitMarksSuccess: (state) => {
            state.loading = false;
        },
        bulkAddUnitMarksFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        updateUnitMarkRequest: (state, _action: PayloadAction<Partial<UnitMark> & { id: string }>) => {
            state.loading = true;
        },
        updateUnitMarkSuccess: (state) => {
            state.loading = false;
        },
        updateUnitMarkFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
    },
});

export const {
    addUnitMarkRequest,
    addUnitMarkSuccess,
    addUnitMarkFailure,
    fetchUnitMarksRequest,
    fetchUnitMarksSuccess,
    fetchUnitMarksFailure,
    deleteUnitMarkRequest,
    deleteUnitMarkSuccess,
    deleteUnitMarkFailure,
    bulkAddUnitMarksRequest,
    bulkAddUnitMarksSuccess,
    bulkAddUnitMarksFailure,
    updateUnitMarkRequest,
    updateUnitMarkSuccess,
    updateUnitMarkFailure,
} = setUnitMarkSlice.actions;

export default setUnitMarkSlice.reducer;
