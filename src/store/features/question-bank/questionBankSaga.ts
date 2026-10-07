

import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    addQuestionRequest,
    addQuestionSuccess,
    addQuestionFailure,
    fetchQuestionsRequest,
    fetchQuestionsSuccess,
    fetchQuestionsFailure,
    updateQuestionRequest,
    updateQuestionSuccess,
    updateQuestionFailure,
    deleteQuestionRequest,
    deleteQuestionSuccess,
    deleteQuestionFailure,
    bulkAddQuestionsRequest,
    bulkAddQuestionsSuccess,
    bulkAddQuestionsFailure,
    generatePaperRequest,
    generatePaperSuccess,
    generatePaperFailure,
} from './questionBankSlice';
import { message, Modal } from 'antd';
import type { Question } from '../question-bank/questionBankSlice';
import React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const shuffleArray = (array: any[]): any[] => {
    let currentIndex = array.length,  randomIndex;
    const newArray = [...array]; // Create a copy to avoid modifying the original array
  
    // While there remain elements to shuffle.
    while (currentIndex > 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [newArray[currentIndex], newArray[randomIndex]] = [
        newArray[randomIndex], newArray[currentIndex]];
    }
  
    return newArray;
};


function* handleFetchQuestions(action: ReturnType<typeof fetchQuestionsRequest>) {
    try {
        const { organizationKey, staffCode } = action.payload;

        let query = supabase.from('question_bank').select('*');
        if (organizationKey) {
            query = query.eq('organization_key', organizationKey);
        }
        if (staffCode) {
            query = query.eq('staff_code', staffCode);
        }

        const { data, error } = yield call(() => query.order('created_at', { ascending: false }));
        if (error) throw error;

        yield put(fetchQuestionsSuccess(data));
    } catch (err: any) {
        message.error(`Failed to fetch questions: ${err.message}`);
        yield put(fetchQuestionsFailure(err.message));
    }
}

function* handleAddQuestion(action: ReturnType<typeof addQuestionRequest>) {
    try {
        const payload = { ...action.payload };

        // Clean up payload: if it's not a 1-mark MCQ, nullify option fields
        if (payload.question_type !== 1 || payload.title !== 'Choose the correct answer') {
            payload.option1 = undefined;
            payload.option2 = undefined;
            payload.option3 = undefined;
            payload.option4 = undefined;
        }
        if (payload.question_type !== 1) {
            payload.title = undefined;
        }
        
         // Specific handling for "Match the Following" answers
        if (payload.question_type === 1 && payload.title === 'Match the Following' && payload.answer) {
            payload.answer = payload.answer.split('\n').map(line => line.trim()).filter(Boolean).join('\n');
        }


        const { error } = yield call(() => supabase.from('question_bank').insert([payload]));
        if (error) {
             if (error.message.includes("violates foreign key constraint")) {
                throw new Error("The selected combination of Class, Subject, Unit, and Mark Type is invalid. Please check your 'Set Unit Mark' configuration.");
             }
             throw error;
        }
        yield put(addQuestionSuccess());
        message.success('Question added successfully!');
        yield put(fetchQuestionsRequest({ 
            organizationKey: action.payload.organization_key,
            staffCode: action.payload.staff_code,
        } as any));
    } catch (err: any) {
        message.error(`Failed to add question: ${err.message}`);
        yield put(addQuestionFailure(err.message));
    }
}

function* handleBulkAddQuestions(action: ReturnType<typeof bulkAddQuestionsRequest>) {
    try {
        const questionsToUpload = action.payload.map(q => {
            const { ...rest } = q;
            return {
                ...rest,
                option1: q.option1 || null,
                option2: q.option2 || null,
                option3: q.option3 || null,
                option4: q.option4 || null,
                title: q.title || null,
            };
        });

        const { error } = yield call(() => supabase.from('question_bank').insert(questionsToUpload));
        if (error) throw error;
        
        yield put(bulkAddQuestionsSuccess());
        message.success(`${questionsToUpload.length} questions uploaded successfully!`);
        yield put(fetchQuestionsRequest({
            organizationKey: questionsToUpload[0].organization_key,
            staffCode: questionsToUpload[0].staff_code,
        } as any));

    } catch (err: any) {
        message.error(`Bulk upload failed: ${err.message}`);
        yield put(bulkAddQuestionsFailure(err.message));
    }
}

function* handleUpdateQuestion(action: ReturnType<typeof updateQuestionRequest>) {
    try {
        const { id, ...updateData } = action.payload;

        // Clean up payload before update
        if (updateData.question_type !== 1 || updateData.title !== 'Choose the correct answer') {
            updateData.option1 = undefined;
            updateData.option2 = undefined;
            updateData.option3 = undefined;
            updateData.option4 = undefined;
        }
        if (updateData.question_type !== 1) {
            updateData.title = undefined;
        }
        
        if (updateData.question_type === 1 && updateData.title === 'Match the Following' && updateData.answer) {
            updateData.answer = updateData.answer.split('\n').map(line => line.trim()).filter(Boolean).join('\n');
        }

        const { error } = yield call(() => supabase.from('question_bank').update(updateData).eq('id', id));
        if (error) throw error;

        yield put(updateQuestionSuccess());
        message.success('Question updated successfully!');
        if (action.payload.organization_key && action.payload.staff_code) {
            yield put(fetchQuestionsRequest({ 
                organizationKey: action.payload.organization_key,
                staffCode: action.payload.staff_code,
            } as any));
        }
    } catch (err: any) {
        message.error(`Failed to update question: ${err.message}`);
        yield put(updateQuestionFailure(err.message));
    }
}

function* handleDeleteQuestion(action: ReturnType<typeof deleteQuestionRequest>): Generator<any, void, any> {
    try {
        const questionId = action.payload;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: question, error: fetchError }: { data: any, error: any } = yield call(() => supabase.from('question_bank').select('organization_key, staff_code').eq('id', questionId).single());
        if (fetchError) throw fetchError;

        const { error: deleteError } = yield call(() => supabase.from('question_bank').delete().eq('id', questionId));
        if (deleteError) throw deleteError;

        yield put(deleteQuestionSuccess(questionId));
        message.success('Question deleted successfully!');
        if (question?.organization_key && question?.staff_code) {
             yield put(fetchQuestionsRequest({
                organizationKey: question.organization_key,
                staffCode: question.staff_code
             } as any));
        }
    } catch(err: any) {
        message.error(`Failed to delete question: ${err.message}`);
        yield put(deleteQuestionFailure(err.message));
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleGeneratePaper(action: ReturnType<typeof generatePaperRequest>): Generator<any, void, any> {
    try {
        const template = action.payload;
        const { parts } = template;
        const allSelectedIds = new Set<string>();

        if (parts && Array.isArray(parts)) {
            parts.forEach((part: any) => {
                if (!part) return;

                if (part.is_choice && part.manual_choice_questions) {
                    Object.values(part.manual_choice_questions).forEach((pair: any) => {
                        if (pair) {
                            if (pair.a) allSelectedIds.add(pair.a);
                            if (pair.b) allSelectedIds.add(pair.b);
                        }
                    });
                } else if (part.manual_questions) {
                    if (part.mark_type === 1) {
                        Object.values(part.manual_questions).forEach((questionTypeGroup: any) => {
                            if (questionTypeGroup) {
                                Object.values(questionTypeGroup).forEach((id: any) => {
                                    if (id) allSelectedIds.add(id);
                                });
                            }
                        });
                    } else {
                        const questionGroup = part.manual_questions[part.mark_type];
                        if (Array.isArray(questionGroup)) {
                            questionGroup.forEach((id: string) => {
                                if (id) allSelectedIds.add(id);
                            });
                        }
                    }
                }
            });
        }
        
        if (allSelectedIds.size === 0) {
            throw new Error('No questions were selected for the paper.');
        }

        const { data: fetchedQuestions, error: fetchError } = yield call(() =>
            supabase.from('question_bank').select('*').in('id', Array.from(allSelectedIds))
        );

        if (fetchError) throw fetchError;
        if (!fetchedQuestions || fetchedQuestions.length === 0) {
            throw new Error("Could not find the selected questions in the database.");
        }
        
        const questionsMap: Map<string, Question> = new Map(fetchedQuestions.map((q: Question) => [q.id, q]));
        
        // --- START OF SHUFFLING LOGIC ---
        // Create a new map to hold modified questions.
        const modifiedQuestionsMap: Map<string, Question> = new Map([...questionsMap]);

        // Iterate through the original map to find and modify "Match the Following" questions.
        modifiedQuestionsMap.forEach((q: Question, id: string) => {
           if (q.question_type === 1 && q.title === 'Match the Following' && q.answer) {
               const answerLines = q.answer.split('\n');
               const shuffledAnswerLines = shuffleArray(answerLines);
               const shuffledAnswerString = shuffledAnswerLines.join('\n');
               
               // Create a new question object with the shuffled answer.
               const newQuestion = { ...q, answer: shuffledAnswerString };
               // Replace the old question with the new one in our modified map.
               modifiedQuestionsMap.set(id, newQuestion);
           }
        });
        // --- END OF SHUFFLING LOGIC ---

        const finalPaper: Record<string, Question[]> = {};
        if (parts && Array.isArray(parts)) {
            parts.forEach((part: any) => {
                if (!part) return;
                const partKey = `Part ${part.partName}`;
                if (!finalPaper[partKey]) {
                    finalPaper[partKey] = [];
                }
                
                let partQuestions: Question[] = [];

                if (part.is_choice && part.manual_choice_questions) {
                     Object.values(part.manual_choice_questions).forEach((pair: any) => {
                        if (pair?.a) {
                            const question = modifiedQuestionsMap.get(pair.a);
                            if (question) partQuestions.push(question);
                        }
                        if (pair?.b) {
                           const question = modifiedQuestionsMap.get(pair.b);
                           if (question) partQuestions.push(question);
                        }
                    });
                } else if (part.manual_questions) {
                     if (part.mark_type === 1) {
                         Object.values(part.manual_questions).forEach((questionTypeGroup: any) => {
                             if (questionTypeGroup) {
                                Object.values(questionTypeGroup).forEach((id: any) => {
                                    if (id) {
                                       const question = modifiedQuestionsMap.get(id);
                                       if (question) partQuestions.push(question);
                                    }
                                });
                             }
                         });
                    } else {
                         const questionGroup = part.manual_questions[part.mark_type];
                         if (Array.isArray(questionGroup)) {
                             questionGroup.forEach((id: string) => {
                                 if (id && modifiedQuestionsMap.has(id)) {
                                    const question = modifiedQuestionsMap.get(id);
                                    if (question) partQuestions.push(question);
                                 }
                             });
                         }
                    }
                }
                finalPaper[partKey] = partQuestions;
            });
        }

        yield put(generatePaperSuccess({ template, paper: finalPaper }));
        message.success("Question paper generated successfully! Preview is now available.");
        
    } catch(err: any) {
        yield put(generatePaperFailure(err.message));
    }
}

function* questionBankSaga() {
  yield all([
    takeLatest(fetchQuestionsRequest.type, handleFetchQuestions),
    takeLatest(addQuestionRequest.type, handleAddQuestion),
    takeLatest(bulkAddQuestionsRequest.type, handleBulkAddQuestions),
    takeLatest(updateQuestionRequest.type, handleUpdateQuestion),
    takeLatest(deleteQuestionRequest.type, handleDeleteQuestion),
    takeLatest(generatePaperRequest.type, handleGeneratePaper),
  ]);
}

export default questionBankSaga;










