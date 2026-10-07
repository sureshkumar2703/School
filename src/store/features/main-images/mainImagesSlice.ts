
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface MainImage {
  id: string;
  created_at: string;
  organization_key: string;
  image_url: string;
  image_path: string;
}

export interface UploadMainImagesPayload {
    organizationKey: string;
    files: File[];
}

export interface DeleteMainImagePayload {
    organizationKey: string;
    imageId: string;
    imagePath: string;
}

interface MainImagesState {
  images: MainImage[];
  loading: boolean;
  error: string | null;
}

const initialState: MainImagesState = {
  images: [],
  loading: false,
  error: null,
};

const mainImagesSlice = createSlice({
  name: 'mainImages',
  initialState,
  reducers: {
    // Fetch
    fetchMainImagesRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchMainImagesSuccess: (state, action: PayloadAction<MainImage[]>) => {
      state.loading = false;
      state.images = action.payload;
    },
    fetchMainImagesFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Upload
    uploadMainImagesRequest: (state, _action: PayloadAction<UploadMainImagesPayload>) => {
      state.loading = true;
    },
    uploadMainImagesSuccess: (state) => {
      state.loading = false;
    },
    uploadMainImagesFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Delete
    deleteMainImageRequest: (state, _action: PayloadAction<DeleteMainImagePayload>) => {
      state.loading = true;
    },
    deleteMainImageSuccess: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.images = state.images.filter(img => img.id !== action.payload);
    },
    deleteMainImageFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchMainImagesRequest,
  fetchMainImagesSuccess,
  fetchMainImagesFailure,
  uploadMainImagesRequest,
  uploadMainImagesSuccess,
  uploadMainImagesFailure,
  deleteMainImageRequest,
  deleteMainImageSuccess,
  deleteMainImageFailure,
} = mainImagesSlice.actions;

export default mainImagesSlice.reducer;
