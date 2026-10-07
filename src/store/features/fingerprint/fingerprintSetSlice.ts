
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface FingerprintPayload {
  fingerIndex: number;
  scanned: boolean;
  quality: number | null;
  template: string | null;
  image: string | null;
}

export interface SaveFingerprintsPayload {
  teacherId: string;
  fingerprints: FingerprintPayload[];
}

interface FingerprintSetState {
  loading: boolean;
  error: string | null;
}

const initialState: FingerprintSetState = {
  loading: false,
  error: null,
};

const fingerprintSetSlice = createSlice({
  name: 'fingerprintSet',
  initialState,
  reducers: {
    saveFingerprintsRequest: (state, _action: PayloadAction<SaveFingerprintsPayload>) => {
      state.loading = true;
      state.error = null;
    },
    saveFingerprintsSuccess: (state) => {
      state.loading = false;
    },
    saveFingerprintsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  saveFingerprintsRequest,
  saveFingerprintsSuccess,
  saveFingerprintsFailure,
} = fingerprintSetSlice.actions;

export default fingerprintSetSlice.reducer;
