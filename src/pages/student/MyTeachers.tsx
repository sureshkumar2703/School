
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Empty, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchStudentDashboardDataRequest } from '../../store/features/student-dashboard/studentDashboardSlice';
import { supabase } from '../../service/supabaseClient';

const { Title, Text } = Typography;

interface TeacherDetails {
  key: string;
  teacher_name: string;
  subjects: string[];
  role: string;
}

const StudentMyTeachers: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, loading, error } = useSelector((state: RootState) => state.studentDashboard);
    const [section, setSection] = useState<string | null>(null);
    const [loadingSection, setLoadingSection] = useState(true);

    useEffect(() => {
        if (user?.organization_key && user?.register_no && user?.academic_year) {
            const fetchSection = async () => {
                setLoadingSection(true);
                try {
                    const { data, error: sectionError } = await supabase
                        .from('class_section_allocations')
                        .select('section_name')
                        .eq('organization_key', user.organization_key)
                        .eq('register_no', user.register_no)
                        .eq('academic_year', user.academic_year)
                        .single();
                    if (sectionError && sectionError.code !== 'PGRST116') throw sectionError;
                    if (data) setSection(data.section_name);
                } catch (err) {
                    console.error("Error fetching student section:", err);
                } finally {
                    setLoadingSection(false);
                }
            };
            fetchSection();
        } else {
            setLoadingSection(false);
        }
    }, [user]);

    useEffect(() => {
        if (user?.organization_key && user?.admitted_class && section && user?.academic_year) {
            dispatch(fetchStudentDashboardDataRequest({
                organizationKey: user.organization_key,
                className: user.admitted_class,
                sectionName: section,
                academicYear: user.academic_year,
            }));
        }
    }, [dispatch, user, section]);

    const teacherData = useMemo(() => {
        if (!mappings || mappings.length === 0) {
            return [];
        }

        const teachersMap = mappings.reduce((acc, m) => {
            if (!m.teacher_name || !m.subject_name) return acc;

            let teacherEntry = acc.get(m.teacher_name);
            if (!teacherEntry) {
                teacherEntry = { key: m.teacher_name, teacher_name: m.teacher_name, subjects: [], role: m.role || 'Subject Teacher' };
                acc.set(m.teacher_name, teacherEntry);
            }
            if (!teacherEntry.subjects.includes(m.subject_name)) {
                teacherEntry.subjects.push(m.subject_name);
            }
            if (m.role === 'Class Teacher') {
                teacherEntry.role = 'Class Teacher';
            }
            
            return acc;
        }, new Map<string, TeacherDetails>());

        return Array.from(teachersMap.values());
    }, [mappings]);
    
    const isLoading = loading || loadingSection;

    if (isLoading) {
        return <Spin tip="Loading your teacher details..." fullscreen />;
    }
    
    if (error) {
        return <Alert message="Error" description={error} type="error" showIcon />;
    }
    
    const columns: ColumnsType<TeacherDetails> = [
        {
            title: 'Teacher Name',
            dataIndex: 'teacher_name',
            key: 'teacher_name',
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (role: string) => (
                <Tag color={role === 'Class Teacher' ? 'success' : 'geekblue'}>{role}</Tag>
            )
        },
        {
            title: 'Subjects Handled',
            dataIndex: 'subjects',
            key: 'subjects',
            render: (subjects: string[]) => (
                <>
                    {subjects.map(subject => (
                        <Tag color="default" key={subject}>{subject}</Tag>
                    ))}
                </>
            ),
        },
    ];

    return (
        <Card>
            <Title level={4}>My Teachers</Title>
            <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
                List of teachers for your class: {user?.admitted_class} - Section {section} ({user?.academic_year})
            </Text>
             {teacherData.length > 0 ? (
                <Table
                    columns={columns}
                    dataSource={teacherData}
                    rowKey="key"
                    bordered
                    scroll={{ x: 'max-content' }}
                />
            ) : (
                 <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<Text>No teachers have been assigned to your class section yet.</Text>}
                />
            )}
        </Card>
    );
};

export default StudentMyTeachers;
