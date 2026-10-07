

import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    generateHomeTestRequest,
    generateHomeTestSuccess,
    generateHomeTestFailure,
    saveHomeTestRequest,
    saveHomeTestSuccess,
    saveHomeTestFailure,
    fetchHomeTestsRequest,
    fetchHomeTestsSuccess,
    fetchHomeTestsFailure,
    fetchStudentHomeTestsRequest,
    fetchStudentHomeTestsSuccess,
    fetchStudentHomeTestsFailure,
    type GenerateHomeTestPayload,
    type SaveHomeTestPayload,
    type FetchStudentHomeTestsPayload,
} from './homeTestSlice';
import { message } from 'antd';
import type { Question } from '../question-bank/questionBankSlice';


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleGenerateHomeTest(action: ReturnType<typeof generateHomeTestRequest>): Generator<any, void, any> {
    try {
        const payload: GenerateHomeTestPayload = action.payload;
        const { organizationKey, staffCode, academicYear, className, sectionName, subjectCode, unit, questionCounts } = payload;
        
        let questionQuery = supabase
            .from('question_bank')
            .select('*')
            .eq('organization_key', organizationKey)
            .eq('staff_code', staffCode)
            .eq('academic_year', academicYear)
            .eq('class', className)
            .eq('section', sectionName)
            .eq('subject_code', subjectCode);

        if (unit !== 'All Units') {
            questionQuery = questionQuery.eq('unit', unit);
        }
        
        const { data: availableQuestions, error: fetchError } = yield call(() => questionQuery);
        if (fetchError) throw fetchError;

        if (!availableQuestions || availableQuestions.length === 0) {
            throw new Error('No questions found matching the selected criteria in the Question Bank.');
        }

        const selectedQuestions: Question[] = [];
        const usedQuestionIds = new Set<string>();

        // Process each mark type specified in the template
        for (const mark in questionCounts) {
            const count = questionCounts[mark];
            if (count > 0) {
                const markValue = parseInt(mark, 10);
                const candidates = availableQuestions.filter((q: Question) => 
                    q.question_type === markValue && !usedQuestionIds.has(q.id)
                );

                if (candidates.length < count) {
                    throw new Error(`Not enough ${markValue}-mark questions available. Found ${candidates.length}, need ${count}.`);
                }
                
                // Shuffle and pick
                const shuffled = candidates.sort(() => 0.5 - Math.random()).slice(0, count);
                selectedQuestions.push(...shuffled);
                shuffled.forEach((q: Question) => usedQuestionIds.add(q.id!));
            }
        }
        
        const groupedByMarks = selectedQuestions.reduce((acc, q) => {
            const markKey = String(q.question_type);
            if (!acc[markKey]) {
                acc[markKey] = [];
            }
            acc[markKey].push(q);
            return acc;
        }, {} as Record<string, Question[]>);


        yield put(generateHomeTestSuccess({ template: payload, paper: groupedByMarks }));
        message.success("Question paper generated successfully! You can now preview it.");

    } catch (err: any) {
        yield put(generateHomeTestFailure(err.message));
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleSaveHomeTest(action: ReturnType<typeof saveHomeTestRequest>): Generator<any, void, any> {
    try {
        const payload: SaveHomeTestPayload = action.payload;
        const { error } = yield call(() => supabase.from('home_test').insert([payload]));
        if (error) {
            throw error;
        }
        yield put(saveHomeTestSuccess());
        message.success('Home test saved successfully.');
        yield put(fetchHomeTestsRequest({ 
            organizationKey: payload.organization_key,
            staffCode: payload.staff_code,
        }));
    } catch (err: any) {
        message.error(`Failed to save home test: ${err.message}`);
        yield put(saveHomeTestFailure(err.message));
    }
}

function* handleFetchHomeTests(action: ReturnType<typeof fetchHomeTestsRequest>) {
    try {
        const { organizationKey, staffCode } = action.payload;
        const { data, error } = yield call(() =>
            supabase
                .from('home_test')
                .select('*')
                .eq('organization_key', organizationKey)
                .eq('staff_code', staffCode)
                .order('test_date', { ascending: false })
        );
        if (error) throw error;
        yield put(fetchHomeTestsSuccess(data || []));
    } catch (err: any) {
        yield put(fetchHomeTestsFailure(err.message));
    }
}

function* handleFetchStudentHomeTests(action: ReturnType<typeof fetchStudentHomeTestsRequest>): Generator<any, void, any> {
    try {
        const { organizationKey } = action.payload as FetchStudentHomeTestsPayload;
        const { data, error } = yield call(() =>
            supabase
                .from('home_test')
                .select('*')
                .eq('organization_key', organizationKey)
                .order('test_date', { ascending: false })
        );
        if (error) throw error;
        yield put(fetchStudentHomeTestsSuccess(data || []));
    } catch (err: any) {
        yield put(fetchStudentHomeTestsFailure(err.message));
    }
}


function* homeTestSaga() {
  yield all([
    takeLatest(generateHomeTestRequest.type, handleGenerateHomeTest),
    takeLatest(saveHomeTestRequest.type, handleSaveHomeTest),
    takeLatest(fetchHomeTestsRequest.type, handleFetchHomeTests),
    takeLatest(fetchStudentHomeTestsRequest.type, handleFetchStudentHomeTests),
  ]);
}

export default homeTestSaga;
