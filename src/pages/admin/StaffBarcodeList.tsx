import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Row, Col, Input, Button, Space, Avatar, Image, Divider } from 'antd';
import { UserOutlined, PrinterOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeachersRequest, type Teacher } from '../../store/features/teachers/teachersSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { useReactToPrint } from 'react-to-print';

const { Title, Text } = Typography;
const { Search } = Input;

const StaffBarcodeList: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { teachers, loading, error } = useSelector((state: RootState) => state.teachers);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [printingStaff, setPrintingStaff] = useState<Teacher | null>(null);
    
    const bulkPrintRef = useRef<HTMLDivElement>(null);
    const individualPrintRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeachersRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    const filteredTeachers = useMemo(() => {
        if (!searchTerm) return teachers;
        const lowerSearch = searchTerm.toLowerCase();
        return teachers.filter(t => 
            t.full_name?.toLowerCase().includes(lowerSearch) ||
            t.staff_code?.toLowerCase().includes(lowerSearch) ||
            t.email?.toLowerCase().includes(lowerSearch) ||
            t.mobile_number?.includes(lowerSearch)
        );
    }, [teachers, searchTerm]);

    const handleBulkPrint = useReactToPrint({
        content: () => bulkPrintRef.current,
        documentTitle: 'staff-barcode-list',
    });

    const handleIndividualPrintTrigger = useReactToPrint({
        content: () => individualPrintRef.current,
        onAfterPrint: () => setPrintingStaff(null),
    });

    const handlePrintOne = (record: Teacher) => {
        setPrintingStaff(record);
        // We need a small timeout to let the state update and the ref content render
        setTimeout(() => {
            handleIndividualPrintTrigger();
        }, 100);
    };

    const columns: ColumnsType<Teacher> = [
        {
            title: 'Staff Member',
            key: 'staff',
            render: (_, record) => (
                <Space>
                    <Avatar src={record.photo_url} icon={<UserOutlined />} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Text strong>{record.full_name}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>{record.designation || 'Teacher'}</Text>
                    </div>
                </Space>
            ),
        },
        { title: 'Staff Code', dataIndex: 'staff_code', key: 'staff_code' },
        { title: 'Contact', dataIndex: 'mobile_number', key: 'mobile_number' },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        {
            title: 'Barcode',
            key: 'barcode',
            align: 'center' as const,
            render: (_, record) => (
                record.staff_code ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Image
                            src={`https://barcode.tec-it.com/barcode.ashx?data=${record.staff_code}&code=Code128&dpi=96`}
                            preview={false}
                            style={{ height: '40px', maxWidth: '150px' }}
                        />
                        <Text style={{ fontSize: '10px' }}>{record.staff_code}</Text>
                    </div>
                ) : 'N/A'
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 100,
            align: 'center',
            render: (_, record) => (
                <Button 
                    icon={<PrinterOutlined />} 
                    onClick={() => handlePrintOne(record)}
                    type="link"
                >
                    Print
                </Button>
            )
        }
    ];

    return (
        <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <Title level={4} style={{ margin: 0 }}>Staff ID & Barcode Management</Title>
                    <Text type="secondary">Generate and print barcodes for staff attendance and identification.</Text>
                </Col>
                <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                    <Space wrap>
                        <Search
                            placeholder="Search by name, code or email"
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: 300 }}
                            allowClear
                        />
                        <Button type="primary" icon={<PrinterOutlined />} onClick={handleBulkPrint} disabled={filteredTeachers.length === 0}>
                            Print All
                        </Button>
                    </Space>
                </Col>
            </Row>

            {error && <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}

            <Spin spinning={loading}>
                <div style={{ overflowX: 'auto' }}>
                    <Table
                        columns={columns}
                        dataSource={filteredTeachers}
                        rowKey="id"
                        bordered
                        pagination={{ pageSize: 10 }}
                    />
                </div>
            </Spin>

            {/* Hidden Printable Area: Bulk List */}
            <div style={{ display: 'none' }}>
                <div ref={bulkPrintRef} style={{ padding: '20mm' }}>
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        {schoolDetails?.logo_url && <img src={schoolDetails.logo_url} alt="Logo" style={{ maxHeight: '60px', marginBottom: '10px' }} />}
                        <Title level={3} style={{ margin: 0 }}>{schoolDetails?.school_name}</Title>
                        <Text>{schoolDetails?.address}</Text>
                        <Divider style={{ margin: '15px 0' }} />
                        <Title level={4}>STAFF BARCODE DIRECTORY</Title>
                    </div>
                    
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f0f0f0' }}>
                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>S.No</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Staff Name</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Staff Code</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Contact</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>Barcode</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTeachers.map((t, index) => (
                                <tr key={t.id}>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{index + 1}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{t.full_name}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{t.staff_code}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{t.mobile_number}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                        {t.staff_code && (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <img 
                                                    src={`https://barcode.tec-it.com/barcode.ashx?data=${t.staff_code}&code=Code128`} 
                                                    alt="barcode" 
                                                    style={{ height: '30px' }} 
                                                />
                                                <span style={{ fontSize: '8px' }}>{t.staff_code}</span>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    <div style={{ marginTop: '30px', textAlign: 'right' }}>
                        <Text type="secondary">Generated on {new Date().toLocaleDateString()}</Text>
                    </div>
                </div>
            </div>

            {/* Hidden Printable Area: Individual Badge */}
            <div style={{ display: 'none' }}>
                <div ref={individualPrintRef} style={{ width: '85mm', height: '55mm', padding: '5mm', border: '1px solid #eee', position: 'relative' }}>
                    {printingStaff && (
                        <div style={{ border: '2px solid #1890ff', height: '100%', borderRadius: '8px', padding: '3mm', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginBottom: '5px' }}>
                                    {schoolDetails?.logo_url && <img src={schoolDetails.logo_url} alt="Logo" style={{ maxHeight: '25px' }} />}
                                    <Text strong style={{ fontSize: '12px', color: '#1890ff' }}>{schoolDetails?.school_name?.toUpperCase()}</Text>
                                </div>
                                <Divider style={{ margin: '5px 0' }} />
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <Avatar size={50} src={printingStaff.photo_url} icon={<UserOutlined />} style={{ marginBottom: '5px', border: '2px solid #f0f0f0' }} />
                                <Text strong style={{ fontSize: '14px', display: 'block' }}>{printingStaff.full_name?.toUpperCase()}</Text>
                                <Text type="secondary" style={{ fontSize: '10px', display: 'block' }}>{printingStaff.designation || 'Staff Member'}</Text>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <img 
                                    src={`https://barcode.tec-it.com/barcode.ashx?data=${printingStaff.staff_code}&code=Code128&dpi=96`} 
                                    alt="barcode" 
                                    style={{ height: '35px', maxWidth: '100%' }} 
                                />
                                <Text strong style={{ fontSize: '10px', letterSpacing: '2px' }}>{printingStaff.staff_code}</Text>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default StaffBarcodeList;