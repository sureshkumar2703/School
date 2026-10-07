
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Book {
    id: string;
    organization_key: string;
    book_code: string;
    book_name: string;
    author_name: string;
    description?: string;
    no_of_books?: number;
    status: 'Active' | 'Inactive' | 'Progress';
    created_at?: string;
}

export type AddBookPayload = Omit<Book, 'id' | 'created_at'>;
export type BulkAddBooksPayload = {
    books: Omit<Book, 'id' | 'created_at' | 'organization_key'>[];
    organizationKey: string;
}

interface BooksState {
    books: Book[];
    loading: boolean;
    error: string | null;
}

const initialState: BooksState = {
    books: [],
    loading: false,
    error: null,
};

const booksSlice = createSlice({
    name: 'books',
    initialState,
    reducers: {
        // Fetch
        fetchBooksRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
            state.error = null;
        },
        fetchBooksSuccess: (state, action: PayloadAction<Book[]>) => {
            state.loading = false;
            state.books = action.payload;
        },
        fetchBooksFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Add
        addBookRequest: (state, _action: PayloadAction<AddBookPayload>) => {
            state.loading = true;
        },
        addBookSuccess: (state) => {
            state.loading = false;
        },
        addBookFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Bulk Add
        bulkAddBooksRequest: (state, _action: PayloadAction<BulkAddBooksPayload>) => {
            state.loading = true;
        },
        bulkAddBooksSuccess: (state) => {
            state.loading = false;
        },
        bulkAddBooksFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Update
        updateBookRequest: (state, _action: PayloadAction<Partial<Book> & { id: string }>) => {
            state.loading = true;
        },
        updateBookSuccess: (state) => {
            state.loading = false;
        },
        updateBookFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Delete
        deleteBookRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
        },
        deleteBookSuccess: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.books = state.books.filter(b => b.id !== action.payload);
        },
        deleteBookFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
    },
});

export const {
    fetchBooksRequest,
    fetchBooksSuccess,
    fetchBooksFailure,
    addBookRequest,
    addBookSuccess,
    addBookFailure,
    bulkAddBooksRequest,
    bulkAddBooksSuccess,
    bulkAddBooksFailure,
    updateBookRequest,
    updateBookSuccess,
    updateBookFailure,
    deleteBookRequest,
    deleteBookSuccess,
    deleteBookFailure,
} = booksSlice.actions;

export default booksSlice.reducer;
