
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchNotesRequest,
  fetchNotesSuccess,
  fetchNotesFailure,
  addNoteRequest,
  addNoteSuccess,
  addNoteFailure,
  deleteNoteRequest,
  deleteNoteSuccess,
  deleteNoteFailure,
  type AddNotePayload,
  type FetchNotesPayload,
  type DeleteNotePayload,
} from './notesSlice';
import { message } from 'antd';

const BUCKET_NAME = 'class-notes';

function* handleFetchNotes(action: ReturnType<typeof fetchNotesRequest>) {
  try {
    const { teacherId, className, sectionName, academicYear, subject } = action.payload as FetchNotesPayload;
    const { data, error } = yield call(() =>
      supabase
        .from('class_notes')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('class_name', className)
        .eq('section_name', sectionName)
        .eq('academic_year', academicYear)
        .eq('subject', subject)
        .order('created_at', { ascending: false })
    );
    if (error) throw error;
    yield put(fetchNotesSuccess(data));
  } catch (err: any) {
    message.error(`Failed to fetch notes: ${err.message}`);
    yield put(fetchNotesFailure(err.message));
  }
}

function* handleAddNote(action: ReturnType<typeof addNoteRequest>) {
  try {
    const { file, ...noteDetails } = action.payload as AddNotePayload;
    
    // 1. Upload the file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const sanitizedSubject = noteDetails.subject.replace(/[/\\?%*:|"<>\s]/g, '-');
    const fileName = `${sanitizedSubject}-${Date.now()}.${fileExt}`;
    const filePath = `${noteDetails.organization_key}/${fileName}`;

    const { error: uploadError } = yield call(() =>
      supabase.storage.from(BUCKET_NAME).upload(filePath, file)
    );
    if (uploadError) {
        throw new Error(`Storage Error: ${uploadError.message}. Ensure RLS policies are correct for the '${BUCKET_NAME}' bucket.`);
    }

    // 2. Get the public URL of the uploaded file
    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    // 3. Save the note metadata to the 'class_notes' table
    const noteToInsert = {
      ...noteDetails,
      file_name: file.name,
      file_path: filePath,
      file_url: urlData.publicUrl,
      file_type: file.type || 'unknown',
    };

    const { data, error: dbError } = yield call(() =>
      supabase.from('class_notes').insert([noteToInsert]).select().single()
    );

    if (dbError) throw dbError;

    yield put(addNoteSuccess(data));
    message.success(`Note "${file.name}" uploaded successfully!`);
  } catch (err: any) {
    message.error(err.message || 'An unknown error occurred during upload.');
    yield put(addNoteFailure(err.message));
  }
}


function* handleDeleteNote(action: ReturnType<typeof deleteNoteRequest>) {
  try {
    const { noteId, filePath } = action.payload as DeleteNotePayload;

    // 1. Delete file from storage
    const { error: storageError } = yield call(() =>
      supabase.storage.from(BUCKET_NAME).remove([filePath])
    );
    if (storageError) {
      // Log the error but proceed, as we want to remove the DB record even if the file is gone
      console.error('Could not delete file from storage, but proceeding to delete database record:', storageError.message);
    }
    
    // 2. Delete the record from the database
    const { error: dbError } = yield call(() =>
      supabase.from('class_notes').delete().eq('id', noteId)
    );
    if (dbError) throw dbError;

    yield put(deleteNoteSuccess(noteId));
    message.success('Note deleted successfully!');
  } catch (err: any) {
    message.error(`Failed to delete note: ${err.message}`);
    yield put(deleteNoteFailure(err.message));
  }
}

function* notesSaga() {
  yield all([
    takeLatest(fetchNotesRequest.type, handleFetchNotes),
    takeLatest(addNoteRequest.type, handleAddNote),
    takeLatest(deleteNoteRequest.type, handleDeleteNote),
  ]);
}

export default notesSaga;
