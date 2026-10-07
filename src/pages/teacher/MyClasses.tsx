
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Empty, Tag, Select, Row, Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherDashboardDataRequest, type ClassMapping } from '../../store/features/teacher-dashboard/teacherDashboardSlice';

const { Title, Text } = Typography;
const { Option } = Select;

interface TeacherDetails {
  teacher_name: string;
  subjects: string[];
  role: string;
}

interface ClassInfo {
  key: string;
  class_name: string;
  section_name: string;
  academic_year: string;
  teachers: TeacherDetails[];
}

const MyClasses: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, loading, error } = useSelector((state: RootState) => state.teacherDashboard);
    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    const teacherClassOptions = useMemo(() => {
        if (!mappings || !user?.full_name) {
            return [];
        }
        const myMappings = mappings.filter(m => m.teacher_name === user.full_name);
        const myClassSections = myMappings.reduce((acc, m) => {
            const key = `${m.class_name}||${m.section_name}||${m.academic_year}`;
            if (!acc.has(key)) {
                acc.set(key, { 
                    key, 
                    label: `${m.class_name} - ${m.section_name} (${m.academic_year})` 
                });
            }
            return acc;
        }, new Map<string, { key: string, label: string }>());

        return Array.from(myClassSections.values()).sort((a, b) => b.label.localeCompare(a.label));
    }, [mappings, user?.full_name]);

    const classData = useMemo(() => {
        if (!mappings || !selectedClassKey) {
            return [];
        }
        
        const [className, sectionName, academicYear] = selectedClassKey.split('||');

        const teachersInClass = mappings
            .filter(m => m.class_name === className && m.section_name === sectionName && m.academic_year === academicYear)
            .reduce((acc, m) => {
                if (!m.teacher_name || !m.subject_name) return acc;

                let teacherEntry = acc.get(m.teacher_name);
                if (!teacherEntry) {
                    teacherEntry = { teacher_name: m.teacher_name, subjects: [], role: m.role || 'Subject Teacher' };
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
        
        const mainClassInfo: ClassInfo = {
            key: selectedClassKey,
            class_name: className,
            section_name: sectionName,
            academic_year: academicYear,
            teachers: Array.from(teachersInClass.values()),
        };

        return [mainClassInfo];

    }, [mappings, selectedClassKey]);

    if (loading) {
        return <Spin tip="Loading classes..." fullscreen />;
    }
    
    if (error) {
        return <Alert message="Error" description={error} type="error" showIcon />;
    }
    
    const expandedRowRender = (record: ClassInfo) => {
        const nestedColumns: ColumnsType<TeacherDetails> = [
          {
            title: 'Teacher Name',
            dataIndex: 'teacher_name',
            key: 'teacher_name',
            render: (name: string) => (
                <Text strong style={{ color: name === user?.full_name ? '#1890ff' : 'inherit' }}>
                    {name} {name === user?.full_name && "(You)"}
                </Text>
            )
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
            title: 'Subjects Handled in This Class',
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
    
        return <div style={{overflowX: 'auto'}}><Table columns={nestedColumns} dataSource={record.teachers} pagination={false} rowKey="teacher_name" scroll={{ x: 'max-content' }} /></div>;
    };

    const mainColumns: ColumnsType<ClassInfo> = [
        { title: 'Class', dataIndex: 'class_name', key: 'class_name' },
        { title: 'Section', dataIndex: 'section_name', key: 'section_name' },
        { title: 'Academic Year', dataIndex: 'academic_year', key: 'academic_year' },
    ];


    return (
        <Card>
            <Title level={4}>My Classes</Title>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={12}>
                    <Text type="secondary">
                        Select a class to view its details, including assigned teachers and subjects.
                    </Text>
                </Col>
                <Col xs={24} md={12}>
                     <Select
                        showSearch
                        placeholder="Select a class and section"
                        style={{ width: '100%' }}
                        value={selectedClassKey}
                        onChange={(value) => setSelectedClassKey(value)}
                        allowClear
                        filterOption={(input, option) =>
                            (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {teacherClassOptions.map(option => (
                            <Option key={option.key} value={option.key}>{option.label}</Option>
                        ))}
                    </Select>
                </Col>
            </Row>

             {selectedClassKey ? (
                <div style={{overflowX: 'auto'}}>
                    <Table
                        columns={mainColumns}
                        dataSource={classData}
                        rowKey="key"
                        expandable={{ expandedRowRender, defaultExpandAllRows: true, rowExpandable: () => true }}
                        bordered
                        scroll={{ x: 'max-content' }}
                    />
                </div>
            ) : (
                 <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        teacherClassOptions.length > 0
                            ? <Text>Please select a class to view its details.</Text>
                            : <Text>You are not currently assigned to any classes.</Text>
                    }
                />
            )}
        </Card>
    );
};

export default MyClasses;
