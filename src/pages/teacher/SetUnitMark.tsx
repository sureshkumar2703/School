
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Typography, Upload, message, Table, Spin, Popconfirm, Switch, InputNumber, List, Divider, Alert, Grid, Tag } from 'antd';
import { DownloadOutlined, PlusOutlined, UploadOutlined, FileExcelOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchSubjectsRequest } from '../../store/features/subjects/subjectsSlice';
import { addUnitMarkRequest, bulkAddUnitMarksRequest, fetchUnitMarksRequest, updateUnitMarkRequest, deleteUnitMarkRequest, type UnitMark } from '../../store/features/set-unit-mark/setUnitMarkSlice';
import { fetchRegulationsRequest } from '../../store/features/set-regulation/setRegulationSlice';
import * as XLSX from 'xlsx';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { useMediaQuery } from '../../hooks/useMediaQuery';


const { Title, Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

const SetUnitMark: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
    const [editingMark, setEditingMark] = useState<UnitMark | null>(null);
    const [form] = Form.useForm();
    const [bulkUploadForm] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();
    const isMobile = useMediaQuery('(max-width: 768px)');


    const { user } = useSelector((state: RootState) => state.auth);
    const { unitMarks, loading: unitMarkLoading } = useSelector((state: RootState) => state.setUnitMark);
    const { mappings, calendars: academicYears, loading: mappingsLoading } = useSelector((state: RootState) => state.teacherDashboard);
    const { regulations } = useSelector((state: RootState) => state.setRegulation);
    const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);
    
    // Form-specific watchers
    const selectedClassKey = Form.useWatch('class_key', form);
    const formAcademicYear = Form.useWatch('academic_year', form);

    // Bulk upload form watchers
    const bulkSelectedClassKey = Form.useWatch('class_key', bulkUploadForm);
    const bulkFormAcademicYear = Form.useWatch('academic_year', bulkUploadForm);
    
    // States for bulk upload
    const [fileList, setFileList] = useState<any[]>([]);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [uploadError, setUploadError] = useState<string | null>(null);
    
    // States for new filters
    const [selectedAcademicYearFilter, setSelectedAcademicYearFilter] = useState<string | null>(null);
    const [selectedClassFilter, setSelectedClassFilter] = useState<string | null>(null);
    const [selectedSectionFilter, setSelectedSectionFilter] = useState<string | null>(null);
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string | null>(null);
    
    useEffect(() => {
        if (user?.organization_key && user?.staff_code) {
            dispatch(fetchUnitMarksRequest({ organizationKey: user.organization_key, staffCode: user.staff_code }));
             dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user]);

    useEffect(() => {
        if ((isModalVisible || isBulkModalVisible) && user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(fetchSubjectsRequest());
            dispatch(fetchRegulationsRequest(user.organization_key));
        }
    }, [dispatch, user, isModalVisible, isBulkModalVisible]);
    
    const uniqueYears = useMemo(() => {
        return [...new Set(unitMarks.map(reg => reg.academic_year))].sort((a, b) => b.localeCompare(a));
    }, [unitMarks]);
    
    const academicYearOptions = useMemo(() => {
        if (!academicYears) return [];
        return (academicYears as any[]).filter(cal => cal.status === 'Active');
    }, [academicYears]);
    
    useEffect(() => {
        if (uniqueYears.length > 0 && !selectedAcademicYearFilter) {
            const currentYear = academicYears.find((c: any) => c.is_current)?.academic_year;
            if (currentYear && uniqueYears.includes(currentYear)) {
                setSelectedAcademicYearFilter(currentYear);
            } else {
                setSelectedAcademicYearFilter(uniqueYears[0]);
            }
        }
    }, [uniqueYears, academicYears, selectedAcademicYearFilter]);

    const filteredMarks = useMemo(() => {
        let data = unitMarks;
        if (selectedAcademicYearFilter) {
            data = data.filter(mark => mark.academic_year === selectedAcademicYearFilter);
        }
        if (selectedClassFilter) {
            data = data.filter(mark => mark.class === selectedClassFilter);
        }
         if (selectedSectionFilter) {
            data = data.filter(mark => mark.section === selectedSectionFilter);
        }
        if (selectedSubjectFilter) {
            data = data.filter(mark => mark.subject === selectedSubjectFilter);
        }
        return data;
    }, [unitMarks, selectedAcademicYearFilter, selectedClassFilter, selectedSectionFilter, selectedSubjectFilter]);


    useEffect(() => {
        if (isModalVisible && academicYears.length > 0) {
            if (editingMark) {
                form.setFieldsValue({
                    ...editingMark,
                    class_key: `${editingMark.class}||${editingMark.section}||${editingMark.academic_year}`
                });
            } else {
                const currentYear = academicYears.find((c: any) => c.is_current);
                form.resetFields();
                if (currentYear) {
                    form.setFieldsValue({ academic_year: currentYear.academic_year, status: 'Active' });
                } else {
                    form.setFieldsValue({ status: 'Active' });
                }
            }
        }
    }, [isModalVisible, editingMark, form, academicYears]);

    const showModal = (mark: UnitMark | null = null) => {
        setEditingMark(mark);
        setIsModalVisible(true);
    };
    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingMark(null);
        form.resetFields();
    };

    const showBulkModal = () => setIsBulkModalVisible(true);
    const handleBulkCancel = () => {
        setIsBulkModalVisible(false);
        setFileList([]);
        setParsedData([]);
        setUploadError(null);
    };

    const onFinish = (values: any) => {
        if (!user?.organization_key || !user?.staff_code) return;
        const [className, sectionName, academicYear] = values.class_key.split('||');
        const subjectName = subjects.find(s => s.subject_code === values.subject_code)?.subject_name;

        const payload = {
            organization_key: user.organization_key,
            staff_code: user.staff_code,
            class: className,
            section: sectionName,
            academic_year: academicYear,
            subject: subjectName || 'Unknown',
            regulation: values.regulation,
            unit: values.unit,
            mark_type: values.mark_type,
            status: values.status || 'Active',
        };

        if (editingMark) {
            dispatch(updateUnitMarkRequest({ ...payload, id: editingMark.id }));
        } else {
            dispatch(addUnitMarkRequest(payload as any));
        }

        handleCancel();
    };
    
    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return mappings.filter((m: any) => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);
    
    const classOptions = useMemo(() => {
        if (!formAcademicYear) return [];
        
        const assignmentsForYear = myAssignments.filter((m:any) => m.academic_year === formAcademicYear);
        const uniqueClasses = assignmentsForYear.reduce((acc: any, m: any) => {
            const key = `${m.class_name}||${m.section_name}||${m.academic_year}`;
            if (!acc.has(key)) {
                acc.set(key, { 
                    key, 
                    label: `${m.class_name} - ${m.section_name}` 
                });
            }
            return acc;
        }, new Map<string, { key: string, label: string }>());

        return Array.from(uniqueClasses.values()).sort((a: any, b: any) => a.label.localeCompare(b.label));
    }, [myAssignments, formAcademicYear]);
    
    const bulkClassOptions = useMemo(() => {
        if (!bulkFormAcademicYear) return [];
        
        const assignmentsForYear = myAssignments.filter((m:any) => m.academic_year === bulkFormAcademicYear);
        const uniqueClasses = assignmentsForYear.reduce((acc: any, m: any) => {
            const key = `${m.class_name}||${m.section_name}||${m.academic_year}`;
            if (!acc.has(key)) {
                acc.set(key, { 
                    key, 
                    label: `${m.class_name} - ${m.section_name}`
                });
            }
            return acc;
        }, new Map<string, { key: string, label: string }>());
        return Array.from(uniqueClasses.values()).sort((a: any, b: any) => a.label.localeCompare(b.label));
    }, [myAssignments, bulkFormAcademicYear]);


    const subjectOptions = useMemo(() => {
        const key = selectedClassKey || bulkSelectedClassKey;
        if (!key || !subjects) return [];
        const [className, sectionName, academicYear] = key.split('||');
        
        const subjectNamesForClass = myAssignments
            .filter((m: any) => m.class_name === className && m.section_name === sectionName && m.academic_year === academicYear)
            .map((m: any) => m.subject_name);
        
        return subjects.filter(s => subjectNamesForClass.includes(s.subject_name));

    }, [myAssignments, selectedClassKey, bulkSelectedClassKey, subjects]);
    
    const regulationForClass = useMemo(() => {
        const key = selectedClassKey || bulkSelectedClassKey;
        if (!key) return null;
        const [className, , academicYear] = key.split('||');
        return regulations.find(r => r.academic_year === academicYear && r.class === className)?.regulation || 'No regulation set';
    }, [regulations, selectedClassKey, bulkSelectedClassKey]);
    
    useEffect(() => {
        form.setFieldsValue({ regulation: regulationForClass });
        bulkUploadForm.setFieldsValue({ regulation: regulationForClass });
    }, [regulationForClass, form, bulkUploadForm]);

    const handleDownloadTemplate = () => {
        const headers = ["class", "section", "academic_year", "subject", "regulation", "unit", "mark_type"];
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'UnitMarkTemplate');
        XLSX.writeFile(wb, 'unit_mark_template.xlsx');
    };
    
    const handleDelete = (id: string) => {
        dispatch(deleteUnitMarkRequest(id));
    };

    const handleFileChange = (info: any) => {
        setFileList([info.file]);
        setUploadError(null);
        setParsedData([]);
        const file = info.file.originFileObj || info.file;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (!e.target) {
                setUploadError("Could not read the file.");
                return;
            }
            try {
                const data = new Uint8Array(e.target.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                setParsedData(json);
            } catch (err: any) {
                setUploadError(`Error parsing file: ${err.message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleBulkSubmit = () => {
        if (!user?.organization_key || !user.staff_code) return;
        const recordsToUpload = parsedData.map(row => ({
            ...row,
            organization_key: user.organization_key,
            staff_code: user.staff_code,
            status: 'Active'
        }));
        dispatch(bulkAddUnitMarksRequest(recordsToUpload as any));
        handleBulkCancel();
    };

     const handleStatusChange = (checked: boolean, record: UnitMark) => {
        const newStatus = checked ? 'Active' : 'Inactive';
        dispatch(updateUnitMarkRequest({ ...record, status: newStatus }));
    };
    
    const handlePdfDownload = async () => {
        // PDF download logic
    };

    const handleExcelDownload = () => {
        // Excel download logic
    };
    
    const handleHtmlDownload = () => {
        // HTML download logic
    };

    const columns = [
        { title: 'Academic Year', dataIndex: 'academic_year', key: 'academic_year', width: 120 },
        { title: 'Class', dataIndex: 'class', key: 'class', width: 100 },
        { title: 'Section', dataIndex: 'section', key: 'section', width: 100 },
        { title: 'Subject', dataIndex: 'subject', key: 'subject', width: 150 },
        { title: 'Unit', dataIndex: 'unit', key: 'unit', width: 80 },
        { title: 'Mark Type', dataIndex: 'mark_type', key: 'mark_type', width: 100, render: (val: number) => val },
        { 
            title: 'Status', 
            dataIndex: 'status', 
            key: 'status',
            width: 100,
            render: (status: string, record: UnitMark) => (
                <Switch
                    checkedChildren="Active"
                    unCheckedChildren="Inactive"
                    checked={status === 'Active'}
                    onChange={(checked) => handleStatusChange(checked, record)}
                    loading={unitMarkLoading}
                />
            )
        },
        {
            title: 'Action',
            key: 'action',
            width: 120,
            render: (_: any, record: UnitMark) => (
                 <Space>
                    <Button icon={<EditOutlined />} onClick={() => showModal(record)} />
                    <Popconfirm title="Are you sure to delete this entry?" onConfirm={() => handleDelete(record.id)}>
                        <Button danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const isLoading = unitMarkLoading || mappingsLoading || subjectsLoading;
    const classOptionsForFilter = useMemo(() => {
        if (!selectedAcademicYearFilter) return [];
        const filteredAssignments = myAssignments.filter((m: any) => m.academic_year === selectedAcademicYearFilter);
        return [...new Set(filteredAssignments.map((q: any) => q.class_name))];
    }, [myAssignments, selectedAcademicYearFilter]);

    const sectionOptionsForFilter = useMemo(() => {
        if (!selectedAcademicYearFilter || !selectedClassFilter) return [];
        const filteredAssignments = myAssignments.filter((m: any) => m.academic_year === selectedAcademicYearFilter && m.class_name === selectedClassFilter);
        return [...new Set(filteredAssignments.map((q: any) => q.section_name))];
    }, [myAssignments, selectedAcademicYearFilter, selectedClassFilter]);

    const subjectOptionsForFilter = useMemo(() => {
        if (!selectedAcademicYearFilter || !selectedClassFilter || !selectedSectionFilter) return [];
        const subjectNames = myAssignments
            .filter((m: any) => m.academic_year === selectedAcademicYearFilter && m.class_name === selectedClassFilter && m.section_name === selectedSectionFilter)
            .map((m: any) => m.subject_name);
        return subjects.filter(s => subjectNames.includes(s.subject_name));
    }, [myAssignments, subjects, selectedAcademicYearFilter, selectedClassFilter, selectedSectionFilter]);

    const watermarkStyle: React.CSSProperties = schoolDetails?.logo_url ? {
        position: 'relative',
        ['--watermark-url' as any]: `url('${schoolDetails.logo_url}')`
    } : {};
    
    const DesktopLayout = () => (
        <Table 
            dataSource={filteredMarks} 
            columns={columns} 
            rowKey="id" 
            bordered 
            scroll={{x: 'max-content'}}
            footer={() => (
                <Row justify="end">
                    <Col>
                        <Space wrap>
                            <Text strong>Download Report:</Text>
                            <Button onClick={handlePdfDownload} disabled={filteredMarks.length === 0}>PDF</Button>
                            <Button onClick={handleExcelDownload} disabled={filteredMarks.length === 0}>Excel</Button>
                            <Button onClick={handleHtmlDownload} disabled={filteredMarks.length === 0}>HTML</Button>
                        </Space>
                    </Col>
                </Row>
            )}
        />
    );

    const MobileLayout = () => (
        <List
            itemLayout="vertical"
            dataSource={filteredMarks}
            renderItem={(item: UnitMark) => (
                <List.Item
                    key={item.id}
                    actions={[
                        <Space key="actions">
                            <Button icon={<EditOutlined />} onClick={() => showModal(item)} size="small" />
                            <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(item.id)}>
                                <Button danger icon={<DeleteOutlined />} size="small" />
                            </Popconfirm>
                        </Space>,
                    ]}
                    style={{padding: '12px', borderBottom: '1px solid #f0f0f0'}}
                >
                    <List.Item.Meta
                        title={<Text strong>{item.subject} - Unit {item.unit}</Text>}
                        description={`${item.class} - ${item.section} (${item.academic_year})`}
                    />
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Text>Mark Type: </Text>
                            <Tag>{item.mark_type}</Tag>
                        </Col>
                        <Col>
                            <Switch
                                checked={item.status === 'Active'}
                                onChange={(checked) => handleStatusChange(checked, item)}
                                loading={unitMarkLoading}
                                size="small"
                            />
                        </Col>
                    </Row>
                </List.Item>
            )}
        />
    );


    return (
        <>
             <style>{`
                .ant-table-thead > tr > th {
                    background-color: #e6f7ff !important;
                }
                .ant-table-tbody > tr:nth-child(even) > td {
                    background-color: #fafafa;
                }
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
                <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <Title level={4} style={{ margin: 0 }}>Set Unit Mark</Title>
                    </Col>
                    <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                         <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: isMobile ? '100%' : 'auto' }}>
                            <Button icon={<UploadOutlined />} onClick={showBulkModal} block={isMobile}>Bulk Upload</Button>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()} block={isMobile}>
                                Create
                            </Button>
                        </Space>
                    </Col>
                </Row>
                 <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} md={6}>
                         <Select placeholder="Filter by Year" style={{ width: '100%' }} value={selectedAcademicYearFilter} onChange={(value) => {setSelectedAcademicYearFilter(value); setSelectedClassFilter(null); setSelectedSectionFilter(null); setSelectedSubjectFilter(null);}} allowClear>
                            {uniqueYears.map(year => <Option key={year} value={year}>{year}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} md={6}>
                        <Select placeholder="Filter by Class" style={{ width: '100%' }} value={selectedClassFilter} onChange={(value) => { setSelectedClassFilter(value); setSelectedSectionFilter(null); setSelectedSubjectFilter(null); }} allowClear disabled={!selectedAcademicYearFilter}>
                           {classOptionsForFilter.map(c => <Option key={c} value={c}>{c}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} md={6}>
                        <Select placeholder="Filter by Section" style={{ width: '100%' }} value={selectedSectionFilter} onChange={(value) => { setSelectedSectionFilter(value); setSelectedSubjectFilter(null); }} allowClear disabled={!selectedClassFilter}>
                           {sectionOptionsForFilter.map(s => <Option key={s} value={s}>{s}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} md={6}>
                        <Select showSearch placeholder="Filter by Subject" style={{ width: '100%' }} value={selectedSubjectFilter} onChange={setSelectedSubjectFilter} allowClear disabled={!selectedSectionFilter}
                         filterOption={(input, option) =>
                            (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                         }>
                           {subjectOptionsForFilter.map(s => <Option key={s.subject_code} value={s.subject_name}>{s.subject_name}</Option>)}
                        </Select>
                    </Col>
                </Row>
                <Spin spinning={isLoading}>
                     <div 
                        className="table-background-watermark"
                        style={watermarkStyle}
                    >
                       {isMobile ? <MobileLayout /> : <DesktopLayout />}
                    </div>
                </Spin>
            </Card>

            <Modal
                title={editingMark ? "Edit Unit Mark" : "Create Unit Mark"}
                open={isModalVisible}
                onCancel={handleCancel}
                footer={[
                    <Button key="back" onClick={handleCancel}>Cancel</Button>,
                    <Button key="submit" type="primary" onClick={() => form.submit()} loading={unitMarkLoading}>
                        {editingMark ? 'Update' : 'Save'}
                    </Button>,
                ]}
                 destroyOnHidden
            >
                <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
                    <Row justify="end" style={{ marginBottom: 16 }}>
                        <Col><Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>Download Template</Button></Col>
                    </Row>
                    <Spin spinning={isLoading}>
                        <Row gutter={16}>
                             <Col span={12}>
                                <Form.Item name="academic_year" label="Academic Year" rules={[{ required: true }]}>
                                    <Select placeholder="Select year" loading={mappingsLoading} onChange={() => form.setFieldsValue({ class_key: null, subject_code: null })}>
                                        {(academicYears || []).filter((c: any) => c.status === 'Active').map((cal: any) => (
                                            <Option key={cal.id} value={cal.academic_year}>
                                                {cal.academic_year}{cal.is_current && " (Current)"}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="class_key" label="Class &amp; Section" rules={[{ required: true }]}>
                                    <Select showSearch placeholder="Select a class" disabled={!formAcademicYear}>
                                        {classOptions.map((opt: any) => <Option key={opt.key} value={opt.key}>{opt.label}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="subject_code" label="Subject" rules={[{ required: true }]}>
                                    <Select showSearch placeholder="Select a subject" loading={subjectsLoading} disabled={!selectedClassKey}>
                                        {subjectOptions.map(subject => (
                                            <Option key={subject?.subject_code} value={subject!.subject_code}>
                                                {subject!.subject_name}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                             <Col span={12}>
                                <Form.Item name="regulation" label="Regulation">
                                    <Input disabled />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="unit" label="Unit" rules={[{ required: true }]}>
                                    <InputNumber style={{ width: '100%' }} placeholder="Enter unit number" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="mark_type" label="Mark Type" rules={[{ required: true }]}>
                                    <InputNumber style={{ width: '100%' }} placeholder="Enter marks for this unit" />
                                </Form.Item>
                            </Col>
                             {editingMark && (
                                <Col span={12}>
                                    <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                                        <Select>
                                            <Option value="Active">Active</Option>
                                            <Option value="Inactive">Inactive</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            )}
                        </Row>
                    </Spin>
                </Form>
            </Modal>
            
            <Modal
                title="Bulk Upload Unit Marks"
                open={isBulkModalVisible}
                onCancel={handleBulkCancel}
                destroyOnHidden
                footer={[
                    <Button key="back" onClick={handleBulkCancel}>Cancel</Button>,
                    <Button key="submit" type="primary" disabled={parsedData.length === 0} loading={unitMarkLoading} onClick={handleBulkSubmit}>
                        Upload
                    </Button>,
                ]}
            >
                <Form form={bulkUploadForm}>
                    <Dragger 
                        name="file" 
                        multiple={false}
                        accept=".xlsx, .xls"
                        fileList={fileList}
                        beforeUpload={() => false}
                        onChange={handleFileChange}
                        onRemove={() => { setFileList([]); setParsedData([]); setUploadError(null); }}
                    >
                        <p className="ant-upload-drag-icon"><FileExcelOutlined /></p>
                        <p className="ant-upload-text">Click or drag Excel file to this area to upload</p>
                    </Dragger>
                </Form>
                {uploadError && <Text type="danger" style={{ marginTop: 8, display: 'block' }}>{uploadError}</Text>}
                {parsedData.length > 0 && <Text type="success" style={{ marginTop: 8, display: 'block' }}>Found {parsedData.length} records.</Text>}
            </Modal>
        </>
    );
};

export default SetUnitMark;

