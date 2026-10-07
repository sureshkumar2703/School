
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Typography, Upload, message, Table, Spin, Popconfirm, Switch, InputNumber, List, Divider, Alert, Grid } from 'antd';
import { DownloadOutlined, PlusOutlined, UploadOutlined, FileExcelOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchClassesRequest } from '../../store/features/classes/classesSlice';
import { addRegulationRequest, bulkAddRegulationsRequest, fetchRegulationsRequest, updateRegulationRequest, deleteRegulationRequest, type Regulation } from '../../store/features/set-regulation/setRegulationSlice';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';


const { Title, Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;
const { useBreakpoint } = Grid;

const SetRegulation: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
    const [editingRegulation, setEditingRegulation] = useState<Regulation | null>(null);
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [form] = Form.useForm();
    const [bulkUploadForm] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();
    const screens = useBreakpoint();
    const isMobile = !screens.md;


    const { user } = useSelector((state: RootState) => state.auth);
    const { regulations, loading: regulationsLoading } = useSelector((state: RootState) => state.setRegulation);
    const { calendars, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);
    const { classes, loading: classesLoading } = useSelector((state: RootState) => state.classes);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);
    const selectedAcademicYear = Form.useWatch('academic_year', form);
    
    // States for bulk upload
    const [fileList, setFileList] = useState<any[]>([]);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [uploadError, setUploadError] = useState<string | null>(null);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchRegulationsRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        if (isModalVisible && user?.organization_key) {
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
            dispatch(fetchClassesRequest());
        }
    }, [dispatch, isModalVisible, user?.organization_key]);

    useEffect(() => {
        if (editingRegulation) {
            form.setFieldsValue(editingRegulation);
        } else if (calendars.length > 0 && isModalVisible) {
            const currentYear = calendars.find(cal => cal.is_current);
            if (currentYear) {
                form.setFieldsValue({ academic_year: currentYear.academic_year, status: 'Active' });
            } else {
                form.setFieldsValue({ status: 'Active' });
            }
        }
    }, [calendars, form, isModalVisible, editingRegulation]);
    
    const uniqueYears = useMemo(() => {
        return [...new Set(regulations.map(reg => reg.academic_year))].sort((a, b) => b.localeCompare(a));
    }, [regulations]);
    
    useEffect(() => {
        if (uniqueYears.length > 0 && !selectedYear) {
            const currentYear = calendars.find(c => c.is_current)?.academic_year;
            if (currentYear && uniqueYears.includes(currentYear)) {
                setSelectedYear(currentYear);
            } else {
                setSelectedYear(uniqueYears[0]);
            }
        }
    }, [uniqueYears, calendars, selectedYear]);

    const filteredRegulations = useMemo(() => {
        if (!selectedYear) return regulations;
        return regulations.filter(reg => reg.academic_year === selectedYear);
    }, [regulations, selectedYear]);


    const showModal = (regulation: Regulation | null = null) => {
        setEditingRegulation(regulation);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingRegulation(null);
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
        if (!user?.organization_key) {
            message.error("Organization key not found.");
            return;
        }

        if (editingRegulation) {
            dispatch(updateRegulationRequest({ ...editingRegulation, ...values }));
        } else {
             dispatch(addRegulationRequest({
                ...values,
                organization_key: user.organization_key,
                status: 'Active',
            }));
        }
       
        handleCancel();
    };
    
    const uniqueClassNames = [...new Set(classes.filter(c => c.status === 'Active').map(c => c.class_name))];

    const handleDownloadTemplate = () => {
        const headers = ['academic_year', 'class', 'regulation'];
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Regulations');
        XLSX.writeFile(wb, 'regulation_template.xlsx');
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
                
                const requiredHeaders = ['academic_year', 'class', 'regulation'];
                const fileHeaders = Object.keys(json[0] || {});
                const missingHeaders = requiredHeaders.filter(h => !fileHeaders.includes(h));

                if (missingHeaders.length > 0) {
                     throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
                }
                setParsedData(json);

            } catch (err: any) {
                setUploadError(err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleBulkSubmit = () => {
        if (!user?.organization_key) {
            message.error("Organization key not found.");
            return;
        }
        const dataToUpload = parsedData.map(row => ({
            ...row,
            organization_key: user.organization_key,
            status: 'Active'
        }));
        dispatch(bulkAddRegulationsRequest(dataToUpload));
        handleBulkCancel();
    };

    const handleStatusChange = (checked: boolean, record: Regulation) => {
        const newStatus = checked ? 'Active' : 'Inactive';
        dispatch(updateRegulationRequest({ ...record, status: newStatus }));
    };

    const handleDelete = (id: string) => {
        dispatch(deleteRegulationRequest(id));
    };
    
    const handlePdfDownload = async () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const logoUrl = schoolDetails?.logo_url;
        let logoImg: HTMLImageElement | null = null;
        
        if (logoUrl) {
            try {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error('Could not load logo image.'));
                    img.src = logoUrl;
                });
                logoImg = img;
            } catch (e) {
                console.error(e);
                message.warning("Could not load school logo for watermark. Proceeding without it.");
            }
        }

        const addWatermarkAndHeader = (docInstance: jsPDF) => {
            const pageCount = docInstance.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                docInstance.setPage(i);
                if (logoImg) {
                    const imgWidth = 80;
                    const imgHeight = (logoImg.height * imgWidth) / logoImg.width;
                    const x = (pageWidth - imgWidth) / 2;
                    const y = (docInstance.internal.pageSize.getHeight() - imgHeight) / 2;
                    docInstance.setGState(new (doc as any).GState({ opacity: 0.1 }));
                    docInstance.addImage(logoImg, 'PNG', x, y, imgWidth, imgHeight);
                    docInstance.setGState(new (doc as any).GState({ opacity: 1 }));
                }
                docInstance.setFontSize(16);
                docInstance.text(schoolDetails?.school_name || 'Regulations Report', pageWidth / 2, 15, { align: 'center' });
                docInstance.setFontSize(10);
                docInstance.text(schoolDetails?.address || '', pageWidth / 2, 22, { align: 'center' });
            }
        };

        addWatermarkAndHeader(doc);

        const tableColumns = ["Class", "Regulation"];
        const tableRows = filteredRegulations.map(d => [d.class, d.regulation]);

        autoTable(doc, {
            head: [tableColumns],
            body: tableRows,
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        });

        doc.save(`Regulations-${selectedYear}.pdf`);
    };

    const handleExcelDownload = () => {
        const dataToExport = filteredRegulations.map(d => ({
            'Academic Year': d.academic_year,
            'Class': d.class,
            'Regulation': d.regulation,
            'Status': d.status,
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Regulations ${selectedYear}`);
        XLSX.writeFile(workbook, `Regulations_${selectedYear}.xlsx`);
    };
    
    const handleHtmlDownload = () => {
        let htmlString = `
            <html><head><title>Regulations Report</title>
            <style>
                body { font-family: sans-serif; margin: 20px; }
                .school-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                .school-header img { max-height: 80px; margin-bottom: 10px; }
                .school-header h1 { margin: 0; }
                .school-header p { margin: 0; color: #555; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style></head><body>
            <div class="school-header">
                ${schoolDetails?.logo_url ? `<img src="${schoolDetails.logo_url}" alt="School Logo">` : ''}
                <h1>${schoolDetails?.school_name || 'Regulations Report'}</h1>
                <p>${schoolDetails?.address || ''}</p>
            </div>
            <h2>Regulations for ${selectedYear}</h2>
            <table><thead><tr><th>Class</th><th>Regulation</th><th>Status</th></tr></thead>
            <tbody>${filteredRegulations.map(d => `
                <tr>
                    <td>${d.class}</td><td>${d.regulation}</td><td>${d.status}</td>
                </tr>`).join('')}
            </tbody></table></body></html>
        `;
        const blob = new Blob([htmlString], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Regulations_${selectedYear}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const columns = [
        { title: 'Academic Year', dataIndex: 'academic_year', key: 'academic_year' },
        { title: 'Class', dataIndex: 'class', key: 'class' },
        { title: 'Regulation', dataIndex: 'regulation', key: 'regulation', ellipsis: true },
        { 
            title: 'Status', 
            dataIndex: 'status', 
            key: 'status',
            render: (status: string, record: Regulation) => (
                <Switch
                    checked={status === 'Active'}
                    onChange={(checked) => handleStatusChange(checked, record)}
                    loading={regulationsLoading}
                />
            )
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: Regulation) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => showModal(record)} />
                    <Popconfirm title="Are you sure to delete this regulation?" onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const watermarkStyle: React.CSSProperties = schoolDetails?.logo_url ? {
        position: 'relative',
        ['--watermark-url' as any]: `url('${schoolDetails.logo_url}')`
    } : {};


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
                        <Title level={4} style={{ margin: 0 }}>Set Regulation</Title>
                    </Col>
                    <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                         <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: isMobile ? '100%' : 'auto' }}>
                            <Button icon={<UploadOutlined />} onClick={showBulkModal} block={isMobile}>Bulk Upload</Button>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()} block={isMobile}>
                                Create Regulation
                            </Button>
                        </Space>
                    </Col>
                </Row>
                <Row justify="end" style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} md={8}>
                        <Select
                            placeholder="Filter by Academic Year"
                            style={{ width: '100%' }}
                            value={selectedYear}
                            onChange={setSelectedYear}
                            allowClear
                        >
                            {uniqueYears.map(year => <Option key={year} value={year}>{year}</Option>)}
                        </Select>
                    </Col>
                </Row>
                <Spin spinning={regulationsLoading}>
                     <div 
                        className={schoolDetails?.logo_url ? 'table-background-watermark' : ''}
                        style={watermarkStyle}
                    >
                         <div style={{overflowX: 'auto'}}>
                            <Table 
                                dataSource={filteredRegulations} 
                                columns={columns} 
                                rowKey="id" 
                                bordered 
                                scroll={{ x: 'max-content' }}
                                footer={() => (
                                    <Row justify={isMobile ? 'center' : 'end'}>
                                        <Col>
                                            <Space wrap>
                                                <Text strong>Download Report:</Text>
                                                <Button onClick={handlePdfDownload} disabled={filteredRegulations.length === 0}>PDF</Button>
                                                <Button onClick={handleExcelDownload} disabled={filteredRegulations.length === 0}>Excel</Button>
                                                <Button onClick={handleHtmlDownload} disabled={filteredRegulations.length === 0}>HTML</Button>
                                            </Space>
                                        </Col>
                                    </Row>
                                )}
                            />
                        </div>
                    </div>
                </Spin>
            </Card>

            <Modal
                title={editingRegulation ? 'Edit Regulation' : 'Create Regulation'}
                open={isModalVisible}
                onCancel={handleCancel}
                footer={[
                    <Button key="back" onClick={handleCancel}>Cancel</Button>,
                    <Button key="submit" type="primary" onClick={() => form.submit()} loading={regulationsLoading}>
                        {editingRegulation ? 'Update' : 'Save'}
                    </Button>,
                ]}
            >
                <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
                    <Row justify="end" style={{ marginBottom: 16 }}>
                        <Col>
                             <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>Download Format</Button>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="academic_year" label="Academic Year" rules={[{ required: true }]}>
                                <Select placeholder="Select year" loading={calendarsLoading} disabled={!!editingRegulation}>
                                    {calendars.filter(c => c.status === 'Active').map(cal => (
                                        <Option key={cal.id} value={cal.academic_year}>
                                            {cal.academic_year}{cal.is_current && " (Current)"}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="class" label="Class" rules={[{ required: true }]}>
                                <Select placeholder="Select class" loading={classesLoading} disabled={!selectedAcademicYear || !!editingRegulation}>
                                    {uniqueClassNames.map(className => (
                                        <Option key={className} value={className}>{className}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item name="regulation" label="Regulation" rules={[{ required: true }]}>
                                <Input placeholder="Enter regulation text" />
                            </Form.Item>
                        </Col>
                        {editingRegulation && (
                            <Col span={12}>
                                <Form.Item name="status" label="Status">
                                    <Select>
                                        <Option value="Active">Active</Option>
                                        <Option value="Inactive">Inactive</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        )}
                    </Row>
                </Form>
            </Modal>
            
            <Modal
                title="Bulk Upload Regulations"
                open={isBulkModalVisible}
                onCancel={handleBulkCancel}
                destroyOnClose
                footer={[
                    <Button key="back" onClick={handleBulkCancel}>Cancel</Button>,
                    <Button key="submit" type="primary" disabled={parsedData.length === 0} loading={regulationsLoading} onClick={handleBulkSubmit}>
                        Upload
                    </Button>,
                ]}
            >
                <Form form={bulkUploadForm}>
                    <Dragger 
                        name="file" 
                        multiple={false}
                        accept=".xlsx, .xls, .csv"
                        fileList={fileList}
                        beforeUpload={() => false}
                        onChange={handleFileChange}
                        onRemove={() => { setFileList([]); setParsedData([]); setUploadError(null); }}
                    >
                        <p className="ant-upload-drag-icon"><FileExcelOutlined /></p>
                        <p className="ant-upload-text">Click or drag Excel file to this area to upload</p>
                    </Dragger>
                </Form>
                {uploadError && <Text type="danger" style={{marginTop: 8, display: 'block'}}>{uploadError}</Text>}
                {parsedData.length > 0 && <Text type="success" style={{marginTop: 8, display: 'block'}}>Found {parsedData.length} records to upload.</Text>}
            </Modal>
        </>
    );
};

export default SetRegulation;
