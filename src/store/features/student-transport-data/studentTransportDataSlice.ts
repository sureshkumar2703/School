
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface StudentTransportData {
    id: string;
    organization_key: string;
    bus_no?: string;
    vehicle_no?: string;
    from_address?: string;
    to_address?: string;
    seating_capacity?: number;
    driver_name?: string;
    driver_contact?: string;
    roll_no?: string;
    student_name?: string;
    academic_year?: string;
    class?: string;
    section?: string;
    current_address?: string;
    status: 'Active' | 'Inactive';
    student_id?: string;
    bus_id?: string;
    driver_id?: string;
    bus_fees?: number | null;
    created_at?: string;
}

export type CreateStudentTransportDataPayload = Omit<StudentTransportData, 'id' | 'created_at'>;

export interface UpdateBusFeesPayload {
    studentIds: string[];
    busFees: number;
    academicYear: string;
}


interface StudentTransportDataState {
    allData: StudentTransportData[];
    loading: boolean;
    error: string | null;
}

const initialState: StudentTransportDataState = {
    allData: [],
    loading: false,
    error: null,
};

const studentTransportDataSlice = createSlice({
    name: 'studentTransportData',
    initialState,
    reducers: {
        createStudentTransportDataRequest: (state, _action: PayloadAction<CreateStudentTransportDataPayload[]>) => {
            state.loading = true;
            state.error = null;
        },
        createStudentTransportDataSuccess: (state) => {
            state.loading = false;
        },
        createStudentTransportDataFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Fetch all
        fetchAllStudentTransportDataRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
            state.error = null;
        },
        fetchAllStudentTransportDataSuccess: (state, action: PayloadAction<StudentTransportData[]>) => {
            state.loading = false;
            state.allData = action.payload;
        },
        fetchAllStudentTransportDataFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Update Bus Fees
        updateStudentBusFeesRequest: (state, _action: PayloadAction<UpdateBusFeesPayload>) => {
            state.loading = true;
            state.error = null;
        },
        updateStudentBusFeesSuccess: (state) => {
            state.loading = false;
        },
        updateStudentBusFeesFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
    },
});

export const {
    createStudentTransportDataRequest,
    createStudentTransportDataSuccess,
    createStudentTransportDataFailure,
    fetchAllStudentTransportDataRequest,
    fetchAllStudentTransportDataSuccess,
    fetchAllStudentTransportDataFailure,
    updateStudentBusFeesRequest,
    updateStudentBusFeesSuccess,
    updateStudentBusFeesFailure,
} = studentTransportDataSlice.actions;

export default studentTransportDataSlice.reducer;
