
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchDocumentsRequest,
  fetchDocumentsSuccess,
  fetchDocumentsFailure,
  addDocumentRequest,
  addDocumentSuccess,
  addDocumentFailure,
  deleteDocumentRequest,
  deleteDocumentSuccess,
  deleteDocumentFailure,
  type AddDocumentPayload,
  type FetchDocumentsPayload,
  type DeleteDocumentPayload
} from './studentDocumentsSlice';
import { message } from 'antd';
import { updateStudentRequest } from '../students/studentsSlice';

const BUCKET_NAME = 'student-documents';

// Fetch documents for a specific student within an organization
function* handleFetchDocuments(action: ReturnType<typeof fetchDocumentsRequest>) {
  try {
    const { studentId, organizationKey } = action.payload as FetchDocumentsPayload;
    const { data, error } = yield call(() =>
      supabase
        .from('student_documents')
        .select('*')
        .eq('student_id', studentId)
        .eq('organization_key', organizationKey)
        .order('created_at')
    );
    if (error) throw error;
    yield put(fetchDocumentsSuccess(data));
  } catch (err: any) {
    yield put(fetchDocumentsFailure(err.message));
    message.error(`Failed to fetch documents: ${err.message}`);
  }
}

// Add a new document
function* handleAddDocument(action: ReturnType<typeof addDocumentRequest>) {
  try {
    const { studentId, docType, file, organizationKey } = action.payload as AddDocumentPayload;

    // 1. Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const sanitizedDocType = docType.replace(/[/\\?%*:|"<>\s]/g, '-');
    const fileName = `${sanitizedDocType}-${Date.now()}.${fileExt}`;
    // Store under org key for data isolation
    const filePath = `${organizationKey}/${studentId}/${fileName}`;

    const { error: uploadError } = yield call(() =>
      supabase.storage.from(BUCKET_NAME).upload(filePath, file)
    );
    if (uploadError) throw uploadError;

    // 2. Get public URL
    const { data: urlData } = yield call(() =>
      supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)
    );
    if (!urlData) throw new Error('Could not get public URL for the uploaded file.');
    
    // 3. Insert or Update (Upsert) record into the database
    const documentData = {
      student_id: studentId,
      organization_key: organizationKey,
      doc_type: docType,
      file_path: filePath,
      public_url: urlData.publicUrl,
    };
    
    const { data: dbData, error: dbError } = yield call(() => 
        supabase
          .from('student_documents')
          .upsert(documentData, { onConflict: 'student_id, doc_type' })
          .select()
          .single()
    );

    if (dbError) throw dbError;
    
    // If the uploaded document is the profile photo, update the student's main record
    if (docType === 'Passport Size Photo') {
        yield put(updateStudentRequest({ id: studentId, organization_key: organizationKey, photo_url: urlData.publicUrl }));
    }

    yield put(addDocumentSuccess(dbData));
    message.success('Document uploaded successfully!');
    
    // Refetch documents to ensure UI is in sync
    yield put(fetchDocumentsRequest({ studentId, organizationKey }));

  } catch (err: any) {
    yield put(addDocumentFailure(err.message));
    message.error(`Upload failed: ${err.message}`);
  }
}

// Delete a document
function* handleDeleteDocument(action: ReturnType<typeof deleteDocumentRequest>) {
  try {
    const { docId, filePath, organizationKey } = action.payload as DeleteDocumentPayload;

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
        .from('student_documents')
        .delete()
        .eq('id', docId)
        .eq('organization_key', organizationKey)
    );
    if (dbError) throw dbError;

    yield put(deleteDocumentSuccess(docId));
    message.success('Document deleted successfully!');
  } catch (err: any) {
    yield put(deleteDocumentFailure(err.message));
    message.error(`Delete failed: ${err.message}`);
  }
}

// Watcher Saga
function* studentDocumentsSaga() {
  yield all([
    takeLatest(fetchDocumentsRequest.type, handleFetchDocuments),
    takeLatest(addDocumentRequest.type, handleAddDocument),
    takeLatest(deleteDocumentRequest.type, handleDeleteDocument),
  ]);
}

export default studentDocumentsSaga;
