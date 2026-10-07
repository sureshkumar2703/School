

/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchTeacherStatsRequest,
  fetchTeacherStatsSuccess,
  fetchTeacherStatsFailure,
  type TeacherStats,
  type ClassTeacherAssignment,
} from './teacherStatsSlice';

function* handleFetchTeacherStats(action: ReturnType<typeof fetchTeacherStatsRequest>): Generator<any, void, any> {
  try {
    const { organizationKey, teacherName } = action.payload;

    // 1. Fetch all academic years for the organization
    const { data: allAcademicYears, error: yearError } = yield call(() =>
        supabase
            .from('academic_year')
            .select('academic_year, status, is_current')
            .eq('organization_key', organizationKey)
    );

    if (yearError) throw yearError;
    
    const academicYears = (allAcademicYears || []).map((y: any) => y.academic_year);
    const activeAcademicYear = (allAcademicYears || []).find((y: any) => y.is_current)?.academic_year || null;

    // 2. Fetch all assignments for the teacher across ALL years
    const { data: allAssignments, error: assignmentError } = yield call(() =>
      supabase
        .from('class_subject_teacher_mapping')
        .select('class_name, section_name, role, subject_name, academic_year')
        .eq('organization_key', organizationKey)
        .eq('teacher_name', teacherName)
    );

    if (assignmentError) throw assignmentError;

    // 3. Find the class teacher assignments for ALL years
    const allClassTeacherAssignments = allAssignments.filter((a: any) => a.role === 'Class Teacher');
    const classTeacherAssignmentForCurrentYear = allClassTeacherAssignments.find((a: any) => a.academic_year === activeAcademicYear);

    let studentStats: ClassTeacherAssignment | null = null;
    if (classTeacherAssignmentForCurrentYear) {
        // Fetch student counts only for the current year's assignment for the main stat card
        const { data: allocations, error: allocationError } = yield call(() =>
            supabase
                .from('class_section_allocations')
                .select('register_no')
                .eq('organization_key', organizationKey)
                .eq('class_name', classTeacherAssignmentForCurrentYear.class_name)
                .eq('section_name', classTeacherAssignmentForCurrentYear.section_name)
                .eq('academic_year', activeAcademicYear)
        );
        if (allocationError) throw allocationError;
        
        const registerNos = allocations.map((a: any) => a.register_no);
        if (registerNos.length > 0) {
            const { data: students, error: studentError } = yield call(() =>
                supabase
                    .from('students')
                    .select('gender')
                    .in('register_no', registerNos)
                    .eq('organization_key', organizationKey)
            );
            if (studentError) throw studentError;
            
            studentStats = {
                ...classTeacherAssignmentForCurrentYear,
                male_students: students.filter((s: any) => s.gender === 'Male').length,
                female_students: students.filter((s: any) => s.gender === 'Female').length,
            };
        } else {
             studentStats = { ...classTeacherAssignmentForCurrentYear, male_students: 0, female_students: 0 };
        }
    }

    // 4. Calculate total unique classes for the active year
    const activeYearAssignments = allAssignments.filter((a: any) => a.academic_year === activeAcademicYear);
    const totalClasses = new Set(activeYearAssignments.map((a: any) => `${a.class_name}-${a.section_name}`)).size;
    const subjects: string[] = [...new Set(activeYearAssignments.map((a: any) => a.subject_name).filter(Boolean))] as string[];

    const finalStats: TeacherStats = {
      totalClasses,
      classTeacherAssignment: studentStats,
      allClassTeacherAssignments: allClassTeacherAssignments, // Add this new field
      subjects,
      activeAcademicYear: activeAcademicYear,
      academicYears: academicYears,
    };

    yield put(fetchTeacherStatsSuccess(finalStats));

  } catch (err: any) {
    yield put(fetchTeacherStatsFailure(err.message));
  }
}

function* teacherStatsSaga() {
  yield all([
    takeLatest(fetchTeacherStatsRequest.type, handleFetchTeacherStats),
  ]);
}

export default teacherStatsSaga;
