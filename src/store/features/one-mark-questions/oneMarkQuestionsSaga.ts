

/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import {
  uploadQuestionsRequest,
  uploadQuestionsSuccess,
  uploadQuestionsFailure,
  fetchOneMarkQuestionsRequest,
  fetchOneMarkQuestionsSuccess,
  fetchOneMarkQuestionsFailure,
  updateOneMarkQuestionRequest,
  updateOneMarkQuestionSuccess,
  updateOneMarkQuestionFailure,
  deleteOneMarkQuestionRequest,
  deleteOneMarkQuestionSuccess,
  deleteOneMarkQuestionFailure,
  type UploadQuestionsPayload,
  type OneMarkQuestionBatch,
} from './oneMarkQuestionsSlice';
import { message } from 'antd';


function* handleUploadQuestions(action: ReturnType<typeof uploadQuestionsRequest>): Generator<any, void, any> {
  try {
    const payload: UploadQuestionsPayload = action.payload;

    // Check for existing record
    const { data: existing, error: fetchError } = yield call(() =>
        supabase.from('one_questions')
        .select('id, questions')
        .eq('organization_key', payload.organization_key)
        .eq('academic_year', payload.academic_year)
        .eq('class', payload.class)
        .eq('section', payload.section)
        .eq('subject', payload.subject)
        .eq('title', payload.title)
        .single()
    );

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "single row not found"
        throw fetchError;
    }

    const newQuestions = payload.questions.map(q => ({ ...q, id: uuidv4() }));

    if (existing) {
        // Append new questions to the existing questions array
        const updatedQuestions = [...(existing.questions || []), ...newQuestions];
        const { error: updateError } = yield call(() =>
            supabase.from('one_questions')
            .update({ questions: updatedQuestions })
            .eq('id', existing.id)
        );
        if (updateError) throw updateError;
        message.success(`Appended ${payload.questions.length} questions to the existing batch.`);
    } else {
        // Create a new record
        const insertPayload = { ...payload, questions: newQuestions, status: 'Active' };
        const { error: insertError } = yield call(() => 
            supabase.from('one_questions').insert(insertPayload)
        );
        if (insertError) throw insertError;
        message.success(`Successfully created a new batch with ${payload.questions.length} questions.`);
    }

    yield put(uploadQuestionsSuccess());
    
    // Correctly format the payload for the fetch request
    const fetchPayload = {
      organizationKey: payload.organization_key,
      staffCode: payload.staff_code,
      academicYear: payload.academic_year,
      className: payload.class,
      sectionName: payload.section,
      subject: payload.subject,
    };
    yield put(fetchOneMarkQuestionsRequest(fetchPayload)); // Refetch to update the UI

  } catch (err: any) {
    message.error(`Failed to upload questions: ${err.message}`);
    yield put(uploadQuestionsFailure(err.message));
  }
}

function* handleFetchQuestions(action: ReturnType<typeof fetchOneMarkQuestionsRequest>): Generator<any, void, any> {
    try {
        const { organizationKey, staffCode, academicYear, className, sectionName, subject } = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('one_questions')
                .select('*')
                .eq('organization_key', organizationKey)
                .eq('staff_code', staffCode)
                .eq('academic_year', academicYear)
                .eq('class', className)
                .eq('section', sectionName)
                .eq('subject', subject)
                .order('created_at', { ascending: false })
        );
        if (error) throw error;
        yield put(fetchOneMarkQuestionsSuccess(data));
    } catch(err: any) {
        message.error(`Failed to fetch questions: ${err.message}`);
        yield put(fetchOneMarkQuestionsFailure(err.message));
    }
}

function* handleUpdateQuestion(action: ReturnType<typeof updateOneMarkQuestionRequest>): Generator<any, void, any> {
    try {
        const { id, ...updateData } = action.payload;
        const { data, error } = yield call(() =>
            supabase.from('one_questions').update(updateData).eq('id', id).select().single()
        );
        if (error) throw error;
        yield put(updateOneMarkQuestionSuccess(data));
        message.success('Question updated successfully!');
    } catch (err: any) {
        message.error(`Failed to update question: ${err.message}`);
        yield put(updateOneMarkQuestionFailure(err.message));
    }
}

function* handleDeleteQuestion(action: ReturnType<typeof deleteOneMarkQuestionRequest>): Generator<any, void, any> {
    try {
        const { batchId, questionId } = action.payload;

        const { data: batch, error: fetchError } = yield call(() => 
            supabase.from('one_questions').select('questions').eq('id', batchId).single()
        );
        if (fetchError) throw fetchError;
        
        const updatedQuestions = (batch.questions || []).filter((q: any) => q.id !== questionId);
        
        const { error: updateError } = yield call(() =>
            supabase.from('one_questions').update({ questions: updatedQuestions }).eq('id', batchId)
        );
        if (updateError) throw updateError;
        
        yield put(deleteOneMarkQuestionSuccess());
        message.success('Question deleted successfully!');

    } catch (err: any) {
        message.error(`Failed to delete question: ${err.message}`);
        yield put(deleteOneMarkQuestionFailure(err.message));
    }
}

function* oneMarkQuestionsSaga() {
  yield all([
    takeLatest(uploadQuestionsRequest.type, handleUploadQuestions),
    takeLatest(fetchOneMarkQuestionsRequest.type, handleFetchQuestions),
    takeLatest(updateOneMarkQuestionRequest.type, handleUpdateQuestion),
    takeLatest(deleteOneMarkQuestionRequest.type, handleDeleteQuestion),
  ]);
}

export default oneMarkQuestionsSaga;
