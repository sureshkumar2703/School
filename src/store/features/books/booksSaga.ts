
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    fetchBooksRequest,
    fetchBooksSuccess,
    fetchBooksFailure,
    addBookRequest,
    addBookSuccess,
    addBookFailure,
    updateBookRequest,
    updateBookSuccess,
    updateBookFailure,
    deleteBookRequest,
    deleteBookSuccess,
    deleteBookFailure,
    bulkAddBooksRequest,
    bulkAddBooksSuccess,
    bulkAddBooksFailure,
} from './booksSlice';
import { message } from 'antd';
import { generateBookCode } from '../../../pages/admin/BooksCreate';

function* handleFetchBooks(action: ReturnType<typeof fetchBooksRequest>) {
    try {
        const organizationKey = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('Books')
                .select('*')
                .eq('organization_key', organizationKey)
                .order('created_at', { ascending: false })
        );
        if (error) throw error;
        yield put(fetchBooksSuccess(data));
    } catch (err: any) {
        yield put(fetchBooksFailure(err.message));
    }
}

function* handleAddBook(action: ReturnType<typeof addBookRequest>) {
    try {
        const { error } = yield call(() => supabase.from('Books').insert([action.payload]));
        if (error) throw error;
        yield put(addBookSuccess());
        message.success('Book added successfully!');
        yield put(fetchBooksRequest(action.payload.organization_key));
    } catch (err: any) {
        message.error(`Failed to add book: ${err.message}`);
        yield put(addBookFailure(err.message));
    }
}

function* handleBulkAddBooks(action: ReturnType<typeof bulkAddBooksRequest>) {
    try {
        const { books, organizationKey } = action.payload;
        const booksToInsert = books.map(book => ({
            ...book,
            organization_key: organizationKey,
            book_code: book.book_code || generateBookCode(),
            no_of_books: book.no_of_books || 1,
            status: book.status || 'Active',
        }));

        const { error } = yield call(() => supabase.from('Books').insert(booksToInsert));
        if (error) throw error;

        yield put(bulkAddBooksSuccess());
        message.success(`${books.length} books uploaded successfully!`);
        yield put(fetchBooksRequest(organizationKey));

    } catch (err: any) {
        message.error(`Bulk upload failed: ${err.message}`);
        yield put(bulkAddBooksFailure(err.message));
    }
}

function* handleUpdateBook(action: ReturnType<typeof updateBookRequest>) {
    try {
        const { id, ...updateData } = action.payload;
        const { error } = yield call(() => supabase.from('Books').update(updateData).eq('id', id));
        if (error) throw error;
        yield put(updateBookSuccess());
        message.success('Book updated successfully!');
        if (action.payload.organization_key) {
            yield put(fetchBooksRequest(action.payload.organization_key));
        }
    } catch (err: any) {
        message.error(`Failed to update book: ${err.message}`);
        yield put(updateBookFailure(err.message));
    }
}

function* handleDeleteBook(action: ReturnType<typeof deleteBookRequest>) {
    try {
        const bookId = action.payload;
        const { error } = yield call(() => supabase.from('Books').delete().eq('id', bookId));
        if (error) throw error;
        yield put(deleteBookSuccess(bookId));
        message.success('Book deleted successfully!');
    } catch (err: any) {
        message.error(`Failed to delete book: ${err.message}`);
        yield put(deleteBookFailure(err.message));
    }
}

function* booksSaga() {
    yield all([
        takeLatest(fetchBooksRequest.type, handleFetchBooks),
        takeLatest(addBookRequest.type, handleAddBook),
        takeLatest(bulkAddBooksRequest.type, handleBulkAddBooks),
        takeLatest(updateBookRequest.type, handleUpdateBook),
        takeLatest(deleteBookRequest.type, handleDeleteBook),
    ]);
}

export default booksSaga;
