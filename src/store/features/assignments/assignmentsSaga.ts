
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  addHomeworkRequest,
  addHomeworkSuccess,
  addHomeworkFailure,
  addAssignmentRequest,
  addAssignmentSuccess,
  addAssignmentFailure,
} from './assignmentsSlice';
import { message } from 'antd';

function* handleAddHomework(action: ReturnType<typeof addHomeworkRequest>) {
  try {
    const homeworkData = action.payload;
    const { error } = yield call(() => supabase.from('homework').insert([homeworkData]));

    if (error) {
        throw error;
    }

    yield put(addHomeworkSuccess());
    message.success('Homework saved successfully!');

  } catch (err: any) {
    message.error(`Failed to save homework: ${err.message}`);
    yield put(addHomeworkFailure(err.message));
  }
}

function* handleAddAssignment(action: ReturnType<typeof addAssignmentRequest>) {
  try {
    const { questions, ...assignmentDetails } = action.payload;

    // Step 1: Insert the main assignment record
    const { data: assignmentData, error: assignmentError } = yield call(() =>
      supabase.from('assignments').insert([assignmentDetails]).select().single()
    );

    if (assignmentError) throw assignmentError;
    const newAssignmentId = assignmentData.id;

    // Step 2: Prepare and insert the related questions
    const questionsToInsert = questions.map(q => ({
      ...q,
      assignment_id: newAssignmentId,
      organization_key: assignmentDetails.organization_key,
    }));

    const { error: questionsError } = yield call(() =>
      supabase.from('assignment_questions').insert(questionsToInsert)
    );
    if (questionsError) throw questionsError;


    yield put(addAssignmentSuccess());
    message.success('Assignment and its questions have been saved!');
    
  } catch (err: any) {
    message.error(`Failed to create assignment: ${err.message}`);
    yield put(addAssignmentFailure(err.message));
  }
}


function* assignmentsSaga() {
  yield all([
    takeLatest(addHomeworkRequest.type, handleAddHomework),
    takeLatest(addAssignmentRequest.type, handleAddAssignment),
  ]);
}

export default assignmentsSaga;

    