
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Button, Space, Tag, Row, Col, Select, Avatar, Statistic, message, Form, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { UserOutlined, HistoryOutlined, CameraOutlined, QrcodeOutlined, LoginOutlined, ClockCircleOutlined, CloseOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeachersRequest, updateTeacherAttendanceRequest } from '../../store/features/teachers/teachersSlice';
import dayjs from 'dayjs';
import { Html5Qrcode } from "html5-qrcode";

const { Title, Text } = Typography;
const { Option } = Select;

const CreateTeacherAttendance: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { teachers, loading } = useSelector((state: RootState) => state.teachers);
    
    const [currentTime, setCurrentTime] = useState(dayjs());
    const [selectedStaffCode, setSelectedStaffCode] = useState<string | null>(null);
    const [attendanceType, setAttendanceType] = useState<string | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [isScanningInProgress, setIsScanningInProgress] = useState(false);
    const [scannerStatus, setScannerStatus] = useState<string>("Initializing...");
    
    const qrScannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(dayjs()), 1000);
        if (user?.organization_key) {
            dispatch(fetchTeachersRequest(user.organization_key));
        }
        return () => clearInterval(timer);
    }, [dispatch, user?.organization_key]);

    const recentLogs = useMemo(() => {
        const today = dayjs().format('YYYY-MM-DD');
        return teachers
            .filter(t => t.status === 'Active' && t.biometric)
            .map(t => {
                try {
                    const bio = JSON.parse(t.biometric!);
                    if (bio.date === today) {
                        return {
                            id: t.id,
                            name: t.full_name,
                            staffId: t.staff_code,
                            time: bio.check_in_time ? dayjs(bio.check_in_time).format('hh:mm A') : '--:--',
                            status: bio.check_in_time ? 'PRESENT' : 'ABSENT',
                            duration: bio.check_in_time ? 'Full Day' : 'N/A',
                            photo: t.photo_url
                        };
                    }
                } catch (e) {
                    return null;
                }
                return null;
            })
            .filter(Boolean)
            .sort((a, b) => (b?.time || '').localeCompare(a?.time || '')) as any[];
    }, [teachers]);

    const handleConfirmAttendance = (staffCode: string) => {
        const targetTeacher = teachers.find(t => t.staff_code === staffCode);
        if (!targetTeacher) {
            message.error("Staff record not found for the scanned code.");
            return;
        }

        const isAlreadyPresent = recentLogs.some(log => log.staffId === staffCode && log.status === 'PRESENT');
        
        if (isAlreadyPresent && attendanceType === 'Present') {
            message.warning("Staff already marked as present today. Scan bypassed.");
            return;
        }

        if (!user?.organization_key) return;

        const newAttendance = {
            date: dayjs().format('YYYY-MM-DD'),
            check_in_time: new Date().toISOString(),
        };

        dispatch(updateTeacherAttendanceRequest({
            teacherId: targetTeacher.id,
            biometric: JSON.stringify(newAttendance),
            organizationKey: user.organization_key,
        }));

        message.success(`Attendance logged for ${targetTeacher.full_name}`);
        setSelectedStaffCode(null);
    };

    useEffect(() => {
        if (showScanner) {
            const startScanner = async () => {
                try {
                    qrScannerRef.current = new Html5Qrcode("reader");
                    const config = { fps: 15, qrbox: { width: 300, height: 150 } };

                    await qrScannerRef.current.start(
                        { facingMode: "environment" },
                        config,
                        (decodedText) => {
                            if (isScanningInProgress) return;
                            
                            setIsScanningInProgress(true);
                            setScannerStatus("Barcode detected!");

                            if (selectedStaffCode && decodedText !== selectedStaffCode) {
                                message.error(`Scanned code (${decodedText}) does not match selected staff (${selectedStaffCode})`);
                                setTimeout(() => {
                                    setIsScanningInProgress(false);
                                    setScannerStatus("Please scan your ID card with barcode");
                                }, 3000);
                                return;
                            }

                            handleConfirmAttendance(decodedText);
                            
                            setTimeout(() => {
                                setIsScanningInProgress(false);
                                setScannerStatus("Ready for next scan");
                            }, 3000);
                        },
                        () => {
                            setScannerStatus("Please scan your ID card with barcode");
                        }
                    );
                } catch (err) {
                    console.error("Scanner initialization failed", err);
                    message.error("Failed to start camera. Please check permissions.");
                    setShowScanner(false);
                }
            };

            startScanner();
        }

        return () => {
            if (qrScannerRef.current && qrScannerRef.current.isScanning) {
                qrScannerRef.current.stop().catch(e => console.error("Scanner stop error", e));
            }
        };
    }, [showScanner, selectedStaffCode]);

    const activeTeachers = useMemo(() => {
        return teachers.filter(t => t.status === 'Active');
    }, [teachers]);

    const stats = useMemo(() => {
        const onSite = recentLogs.filter(l => l.status === 'PRESENT').length;
        const late = recentLogs.filter(l => {
            if (l.time === '--:--') return false;
            const checkTime = dayjs(l.time, 'hh:mm A');
            const limit = dayjs('09:00 AM', 'hh:mm A');
            return checkTime.isAfter(limit);
        }).length;
        return { onSite, late };
    }, [recentLogs]);

    const columns: ColumnsType<any> = [
        {
            title: 'STAFF MEMBER',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <Space>
                    <Avatar src={record.photo} icon={<UserOutlined />} style={{ backgroundColor: '#f56a00' }} />
                    <Text strong>{text}</Text>
                </Space>
            )
        },
        {
            title: 'STAFF ID',
            dataIndex: 'staffId',
            key: 'staffId',
            render: (text) => <Text type="secondary">{text}</Text>
        },
        {
            title: 'TIME',
            dataIndex: 'time',
            key: 'time',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'STATUS',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={status === 'PRESENT' ? 'success' : 'error'} style={{ borderRadius: '12px', padding: '0 12px' }}>
                    {status}
                </Tag>
            )
        },
        {
            title: 'DURATION',
            dataIndex: 'duration',
            key: 'duration',
            render: (text) => <Text type="secondary">{text}</Text>
        }
    ];

    const isLogDisabled = !selectedStaffCode || !attendanceType;

    return (
        <div style={{ padding: '24px', background: '#f9fafb', minHeight: '100%' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Title level={2} style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.5px' }}>STAFF ATTENDANCE</Title>
                    <Space style={{ color: '#d32f2f', fontWeight: 600, fontSize: '14px', marginTop: 4 }}>
                        <ClockCircleOutlined />
                        {currentTime.format('dddd, MMMM D, YYYY | hh:mm:ss A').toUpperCase()}
                    </Space>
                </Col>
            </Row>

            <Row gutter={[24, 24]}>
                <Col xs={24} lg={14}>
                    {!showScanner ? (
                        <Card 
                            style={{ height: '100%', borderRadius: '12px', background: '#fff', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #d9d9d9' }}
                        >
                            <Empty 
                                image={<QrcodeOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />}
                                description={
                                    <Space direction="vertical" align="center">
                                        <Text type="secondary" style={{ fontSize: '16px' }}>Scanner Idle</Text>
                                        <Text type="secondary">Select staff and type to activate scanning.</Text>
                                    </Space>
                                }
                            />
                        </Card>
                    ) : (
                        <Card 
                            style={{ height: '100%', borderRadius: '12px', overflow: 'hidden' }} 
                            styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
                        >
                            <div style={{ 
                                flex: 1, 
                                background: '#000', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                position: 'relative',
                                minHeight: '400px',
                                overflow: 'hidden'
                            }}>
                                <div id="reader" style={{ width: '100%', height: '100%' }}></div>
                                
                                <div style={{ 
                                    zIndex: 2,
                                    width: '320px', 
                                    height: '200px', 
                                    border: `2px solid ${isScanningInProgress ? '#52c41a' : '#ff4d4f'}`, 
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(0,0,0,0.2)',
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    transition: 'all 0.3s ease',
                                    pointerEvents: 'none'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        width: '100%',
                                        height: '2px',
                                        background: isScanningInProgress ? '#52c41a' : '#ff4d4f',
                                        top: '50%',
                                        boxShadow: isScanningInProgress ? '0 0 15px #52c41a' : '0 0 10px #ff4d4f',
                                        animation: 'scan 2s linear infinite'
                                    }} />
                                </div>

                                <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 4 }}>
                                    <Button 
                                        shape="circle" 
                                        icon={<CloseOutlined />} 
                                        onClick={() => setShowScanner(false)} 
                                        danger
                                    />
                                </div>

                                <div style={{ position: 'absolute', bottom: '20px', textAlign: 'center', width: '100%', zIndex: 3 }}>
                                    <div style={{ background: 'rgba(0,0,0,0.7)', padding: '12px 24px', borderRadius: '24px', display: 'inline-block' }}>
                                        <Text style={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>
                                            {isScanningInProgress ? (
                                                <><LoadingOutlined style={{ marginRight: 8 }} /> VALIDATING...</>
                                            ) : (
                                                <>{scannerStatus.toUpperCase()}</>
                                            )}
                                        </Text>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}
                </Col>

                <Col xs={24} lg={10}>
                    <Card 
                        title={<Space><LoginOutlined style={{ color: '#d32f2f' }} /> <Text strong>ATTENDANCE ENTRY</Text></Space>}
                        style={{ borderRadius: '12px', marginBottom: 24 }}
                    >
                        <Form layout="vertical">
                            <Form.Item label={<Text type="secondary" style={{ fontSize: '12px' }}>SEARCH STAFF</Text>}>
                                <Select
                                    showSearch
                                    placeholder="Enter Staff Code or Name"
                                    size="large"
                                    value={selectedStaffCode}
                                    onChange={setSelectedStaffCode}
                                    filterOption={(input, option) =>
                                        (option?.children as any).toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {activeTeachers.map(t => (
                                        <Option key={t.staff_code} value={t.staff_code}>
                                            {`${t.staff_code} - ${t.full_name}`}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item label={<Text type="secondary" style={{ fontSize: '12px' }}>SESSION TYPE</Text>}>
                                <Select 
                                    size="large" 
                                    placeholder="Choose Category"
                                    value={attendanceType} 
                                    onChange={setAttendanceType}
                                >
                                    <Option value="Present">Present</Option>
                                    <Option value="Absent">Absent</Option>
                                    <Option value="Permission">Permission</Option>
                                </Select>
                            </Form.Item>
                            <Button 
                                type="primary" 
                                size="large" 
                                block 
                                icon={<CameraOutlined />} 
                                style={{ height: '48px', background: isLogDisabled ? '#f5f5f5' : '#d32f2f', border: 'none' }}
                                onClick={() => setShowScanner(true)}
                                disabled={isLogDisabled || loading}
                            >
                                {showScanner ? 'SCANNER ACTIVE' : 'ACTIVATE SCANNER'}
                            </Button>
                        </Form>
                    </Card>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Card style={{ borderRadius: '12px' }}>
                                <Statistic 
                                    title={<Text type="secondary" style={{ fontSize: '12px' }}>ON-SITE TOTAL</Text>}
                                    value={stats.onSite}
                                    valueStyle={{ fontWeight: 800, fontSize: '32px' }}
                                />
                            </Card>
                        </Col>
                        <Col span={12}>
                            <Card style={{ borderRadius: '12px' }}>
                                <Statistic 
                                    title={<Text type="secondary" style={{ fontSize: '12px' }}>LATE ARRIVALS</Text>}
                                    value={stats.late}
                                    valueStyle={{ fontWeight: 800, fontSize: '32px', color: '#d32f2f' }}
                                    formatter={(val) => String(val).padStart(2, '0')}
                                />
                            </Card>
                        </Col>
                    </Row>
                </Col>
            </Row>

            <Card 
                style={{ marginTop: 24, borderRadius: '12px' }}
                title={<Space><HistoryOutlined style={{ color: '#d32f2f' }} /> <Text strong>TODAY'S LOGS</Text></Space>}
                extra={<Button type="link" style={{ color: '#d32f2f' }}>VIEW ALL RECORDS</Button>}
            >
                <div style={{ overflowX: 'auto' }}>
                    <Table 
                        dataSource={recentLogs} 
                        columns={columns} 
                        pagination={false} 
                        rowKey="id"
                        locale={{ emptyText: 'No attendance logs recorded for today.' }}
                    />
                </div>
            </Card>
            <style>{`
                @keyframes scan {
                    0% { top: 0% }
                    50% { top: 100% }
                    100% { top: 0% }
                }
            `}</style>
        </div>
    );
};

export default CreateTeacherAttendance;
