
import React, { useState, useEffect, useMemo, CSSProperties } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Select, Table, Card, Typography, Spin, Empty, Row, Col, Button, message, Space, Input } from 'antd';
import { EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchClassesRequest } from '../../store/features/classes/classesSlice';
import { fetchAllocationsRequest, updateAllocationRequest, type ClassSectionAllocation } from '../../store/features/class-sections/classSectionsSlice';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';


const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const sectionColors: { [key: string]: { bg: string; text: string; } } = {
    'A': { bg: '#e6f7ff', text: '#1890ff' },
    'B': { bg: '#f6ffed', text: '#52c41a' },
    'C': { bg: '#fffbe6', text: '#faad14' },
    'D': { bg: '#fff1f0', text: '#f5222d' },
    'E': { bg: '#f9f0ff', text: '#722ed1' },
    'F': { bg: '#e6fffb', text: '#13c2c2' },
    'G': { bg: '#fff0f6', text: '#eb2f96' },
};

const ClassSectionHistory: React.FC = () => {
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | null>(null);
    const [editingRow, setEditingRow] = useState<{ allocationId: string; newSection: string; } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { classes, loading: classesLoading } = useSelector((state: RootState) => state.classes);
    const { allocations, loading: allocationsLoading } = useSelector((state: RootState) => state.classSections);
    const { calendars: academicYears, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);


    const activeClasses = classes.filter(c => c.status === 'Active');
    const uniqueClassNames = [...new Set(activeClasses.map(c => c.class_name))];
    const sectionsForSelectedClass = selectedClass 
        ? [...new Set(activeClasses.filter(c => c.class_name === selectedClass).map(c => c.section).filter(Boolean))] as string[]
        : [];

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchClassesRequest());
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        if (selectedClass && selectedAcademicYear && user?.organization_key) {
            dispatch(fetchAllocationsRequest({
                organizationKey: user.organization_key,
                className: selectedClass,
                academicYear: selectedAcademicYear,
            }));
        }
    }, [dispatch, selectedClass, selectedAcademicYear, user?.organization_key]);
    
    useEffect(() => {
        if (academicYears.length > 0 && !selectedAcademicYear) {
            const currentYear = academicYears.find(cal => cal.is_current)?.academic_year;
            if (currentYear) {
                setSelectedAcademicYear(currentYear);
            }
        }
    }, [academicYears, selectedAcademicYear]);


    const handleEdit = (allocation: ClassSectionAllocation) => {
        setEditingRow({
            allocationId: allocation.id,
            newSection: allocation.section_name || '',
        });
    };

    const handleCancelEdit = () => {
        setEditingRow(null);
    };

    const handleUpdate = () => {
        if (!editingRow || !editingRow.allocationId || !user?.organization_key) {
            message.error("Cannot update. Missing necessary information.");
            return;
        }
    
        const allocationToUpdate = allocations.find(alloc => alloc.id === editingRow.allocationId);
    
        if (!allocationToUpdate) {
            message.error("Could not find the allocation record to update.");
            return;
        }
        
        dispatch(updateAllocationRequest({
            id: editingRow.allocationId,
            section_name: editingRow.newSection,
            organization_key: user.organization_key,
        }));
    
        setEditingRow(null);
    };

    const filteredAllocations = useMemo(() => {
        return allocations.filter(allocation =>
            (allocation.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            allocation.register_no?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [allocations, searchTerm]);
    
    const columns = [
        { title: 'Register No', dataIndex: 'register_no', key: 'register_no' },
        { title: 'Full Name', dataIndex: 'full_name', key: 'full_name' },
        { 
            title: 'Allocated Section', 
            key: 'allocated_section',
            render: (_: any, record: ClassSectionAllocation) => {
                const isEditing = editingRow?.allocationId === record.id;
                if (isEditing) {
                    return (
                        <Select
                            value={editingRow.newSection}
                            onChange={(value) => setEditingRow({ ...editingRow, newSection: value })}
                            style={{ width: 120 }}
                        >
                            {sectionsForSelectedClass.map(sec => (
                                <Option key={sec} value={sec}>{sec}</Option>
                            ))}
                        </Select>
                    );
                }
                const section = record.section_name;
                const colorInfo = section && sectionColors[section] ? sectionColors[section] : { bg: 'transparent', text: '#000' };
                return section ? <Text strong style={{ color: colorInfo.text }}>{section}</Text> : <Text type="secondary">Not Allocated</Text>;
            }
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: ClassSectionAllocation) => {
                const isEditing = editingRow?.allocationId === record.id;
                if (isEditing) {
                    return (
                        <Space>
                            <Button type="primary" icon={<SaveOutlined />} onClick={handleUpdate} />
                            <Button icon={<CloseOutlined />} onClick={handleCancelEdit} />
                        </Space>
                    );
                }
                return (
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                );
            },
        },
    ];
    
    const isLoading = classesLoading || allocationsLoading || calendarsLoading;
    
    const watermarkStyle: CSSProperties = schoolDetails?.logo_url ? {
        position: 'relative',
        ['--watermark-url' as any]: `url('${schoolDetails.logo_url}')`
    } : {};
    
    return (
        <>
            <style>{`
                .table-background-watermark::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-image: var(--watermark-url);
                    background-repeat: no-repeat;
                    background-position: center;
                    background-size: contain;
                    opacity: 0.05;
                    pointer-events: none;
                    z-index: 1;
                }
            `}</style>
            <Card>
                <Title level={4}>Class Section History</Title>
                <Row style={{ marginBottom: 24 }} gutter={[16, 16]} align="bottom" justify="space-between">
                    <Col xs={24} md={12}>
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12}>
                                 <Select
                                    showSearch allowClear placeholder="Select a class" style={{ width: '100%' }}
                                    onChange={(value) => setSelectedClass(value)} loading={classesLoading}
                                    value={selectedClass}
                                    filterOption={(input, option) =>
                                        (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {uniqueClassNames.map((className) => (
                                        <Option key={className} value={className}>{className}</Option>
                                    ))}
                                </Select>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Select
                                    showSearch allowClear placeholder="Select Academic Year" style={{ width: '100%' }}
                                    onChange={(value) => setSelectedAcademicYear(value)} disabled={!selectedClass}
                                    value={selectedAcademicYear}
                                    loading={calendarsLoading}
                                    filterOption={(input, option) =>
                                        (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {academicYears.map((year) => (
                                        <Option key={year.id} value={year.academic_year}>{year.academic_year} {year.is_current && "(Current)"}</Option>
                                    ))}
                                </Select>
                            </Col>
                        </Row>
                    </Col>
                     <Col xs={24} md={8}>
                        <Search
                            placeholder="Search by Name or Register No"
                            onSearch={setSearchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%' }}
                            allowClear
                            disabled={!selectedClass || !selectedAcademicYear}
                        />
                    </Col>
                </Row>

                <Spin spinning={isLoading}>
                    <div 
                        className={schoolDetails?.logo_url ? 'table-background-watermark' : ''}
                        style={watermarkStyle}
                    >
                        {selectedClass && selectedAcademicYear ? (
                            <>
                                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                                    <Col>
                                        <Text strong>Total Students in allocation: {filteredAllocations.length}</Text>
                                    </Col>
                                </Row>
                                <div style={{ overflowX: 'auto' }}>
                                    <Table
                                        columns={columns}
                                        dataSource={filteredAllocations}
                                        rowKey="id"
                                        bordered
                                        scroll={{ x: 'max-content' }}
                                        rowClassName={(record) => {
                                            const section = record.section_name;
                                            return section ? `section-row-${section}` : '';
                                        }}
                                    />
                                </div>
                            </>
                        ) : (
                            <Empty description="Please select both a class and an academic year to view history." />
                        )}
                    </div>
                </Spin>
            </Card>
        </>
    );
};

export default ClassSectionHistory;
