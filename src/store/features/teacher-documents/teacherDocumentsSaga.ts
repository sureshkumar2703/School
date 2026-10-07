
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchTeacherDocumentsRequest,
  fetchTeacherDocumentsSuccess,
  fetchTeacherDocumentsFailure,
  addTeacherDocumentRequest,
  addTeacherDocumentSuccess,
  addTeacherDocumentFailure,
  deleteTeacherDocumentRequest,
  deleteTeacherDocumentSuccess,
  deleteTeacherDocumentFailure,
  type AddTeacherDocumentPayload,
  type FetchTeacherDocumentsPayload,
  type DeleteTeacherDocumentPayload
} from './teacherDocumentsSlice';
import { message } from 'antd';
import { updateTeacherRequest } from '../teachers/teachersSlice';

const BUCKET_NAME = 'teacher-documents';

// Fetch documents for a specific teacher within an organization
function* handleFetchDocuments(action: ReturnType<typeof fetchTeacherDocumentsRequest>) {
  try {
    const { teacherId, organizationKey } = action.payload as FetchTeacherDocumentsPayload;
    const { data, error } = yield call(() =>
      supabase
        .from('teacher_documents')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('organization_key', organizationKey)
        .order('created_at')
    );
    if (error) throw error;
    yield put(fetchTeacherDocumentsSuccess(data));
  } catch (err: any) {
    yield put(fetchTeacherDocumentsFailure(err.message));
    message.error(`Failed to fetch documents: ${err.message}`);
  }
}

// Add a new document
function* handleAddDocument(action: ReturnType<typeof addTeacherDocumentRequest>) {
  try {
    const { teacherId, docType, file, organizationKey } = action.payload as AddTeacherDocumentPayload;

    // 1. Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const sanitizedDocType = docType.replace(/[/\\?%*:|"<>\s]/g, '-');
    const fileName = `${sanitizedDocType}-${Date.now()}.${fileExt}`;
    // Store under org key for data isolation
    const filePath = `${organizationKey}/${teacherId}/${fileName}`;

    const { error: uploadError } = yield call(() =>
      supabase.storage.from(BUCKET_NAME).upload(filePath, file)
    );
    if (uploadError) throw uploadError;

    // 2. Get public URL
    const { data: urlData } = yield call(() =>
      supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)
    );
    if (!urlData) throw new Error('Could not get public URL for the uploaded file.');
    
    // 3. Insert record into the database
    const newDocument = {
      teacher_id: teacherId,
      organization_key: organizationKey,
      doc_type: docType,
      file_path: filePath,
      public_url: urlData.publicUrl,
    };
    
    const { data: dbData, error: dbError } = yield call(() => 
        supabase.from('teacher_documents').insert([newDocument]).select().single()
    );

    if (dbError) throw dbError;
    
    // If the uploaded document is the profile photo, update the teacher's main record
    if (docType === 'Passport Size Photo') {
        const teacherUpdatePayload = { id: teacherId, organization_key: organizationKey, photo_url: urlData.publicUrl };
        yield put(updateTeacherRequest(teacherUpdatePayload as any));
    }

    yield put(addTeacherDocumentSuccess(dbData));
    message.success('Document uploaded successfully!');
  } catch (err: any) {
    yield put(addTeacherDocumentFailure(err.message));
    message.error(`Upload failed: ${err.message}`);
  }
}

// Delete a document
function* handleDeleteDocument(action: ReturnType<typeof deleteTeacherDocumentRequest>) {
  try {
    const { docId, filePath, organizationKey } = action.payload as DeleteTeacherDocumentPayload;

    // 1. Delete the file from storage
    const { error: storageError } = yield call(() => 
      supabase.storage.from(BUCKET_NAME).remove([filePath])
    );
    if (storageError) {
      console.error("Could not delete file from storage, but proceeding to delete database record:", storageError.message);
    }
    
    // 2. Delete the record from the database, ensuring org match for security
    const { error: dbError } = yield call(() => 
      supabase
        .from('teacher_documents')
        .delete()
        .eq('id', docId)
        .eq('organization_key', organizationKey)
    );
    if (dbError) throw dbError;

    yield put(deleteTeacherDocumentSuccess(docId));
    message.success('Document deleted successfully!');
  } catch (err: any) {
    yield put(deleteTeacherDocumentFailure(err.message));
    message.error(`Delete failed: ${err.message}`);
  }
}

// Watcher Saga
function* teacherDocumentsSaga() {
  yield all([
    takeLatest(fetchTeacherDocumentsRequest.type, handleFetchDocuments),
    takeLatest(addTeacherDocumentRequest.type, handleAddDocument),
    takeLatest(deleteTeacherDocumentRequest.type, handleDeleteDocument),
  ]);
}

export default teacherDocumentsSaga;
