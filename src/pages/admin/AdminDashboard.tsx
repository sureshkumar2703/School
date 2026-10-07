
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Row, Col, Card, Typography, Select, Spin, Alert, Space, Avatar, List, Button, Calendar, Carousel } from 'antd';
import { UserOutlined, TeamOutlined, DollarCircleOutlined, SolutionOutlined, PlusOutlined, EyeOutlined, MoreOutlined } from '@ant-design/icons';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title as ChartTitle,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrAfter';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchStudentsRequest } from '../../store/features/students/studentsSlice';
import { fetchTeachersRequest } from '../../store/features/teachers/teachersSlice';
import { fetchDriversRequest, type Driver } from '../../store/features/drivers/driversSlice';
import { fetchAttendanceRequest } from '../../store/features/attendance/attendanceSlice';
import { fetchEventsRequest } from '../../store/features/events/eventsSlice';
import { fetchMainImagesRequest } from '../../store/features/main-images/mainImagesSlice';
import { fetchAllStudentFeesRequest } from '../../store/features/student-fees-pay/studentFeesPaySlice';


dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ChartTitle,
    Tooltip,
    Legend,
    ArcElement
);

const { Title, Text } = Typography;
const { Option } = Select;

const StatCard = ({ icon, title, value, color, bgColor }: { icon: React.ReactNode; title: string; value: string | number, color: string, bgColor: string }) => (
    <Card style={{ background: bgColor, borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} styles={{ body: { padding: '20px 24px' } }}>
        <Space align="center" size="large">
            <Avatar size={48} style={{ backgroundColor: color, color: '#fff' }} icon={icon} />
            <div>
                <Text style={{ color: '#555', fontSize: '14px' }}>{title}</Text>
                <Title level={4} style={{ margin: '0', color: '#000' }}>{value}</Title>
            </div>
        </Space>
    </Card>
);

const StudentsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18ZM12 3L1 9L12 15L23 9L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const TeachersIcon = () => (
     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 21V19C17 16.7909 15.2091 15 13 15H5C2.79086 15 1 16.7909 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M23 21V19C22.9992 17.1804 21.8415 15.5343 20 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 3.34C17.9158 3.84883 18.6657 4.65448 19.1436 5.64293C19.6215 6.63137 19.8115 7.75549 19.6953 8.86C19.5792 9.96449 19.1623 11.0028 18.4912 11.8659" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const EmployeeIcon = () => (
     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M15 15.75H18C18 14.51 17.44 13.38 16.48 12.64C15.52 11.9 14.28 11.5 13 11.5H11C9.72 11.5 8.48 11.9 7.52 12.64C6.56 13.38 6 14.51 6 15.75H9" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 11.5C13.24 11.5 14.25 10.49 14.25 9.25C14.25 8.01 13.24 7 12 7C10.76 7 9.75 8.01 9.75 9.25C9.75 10.49 10.76 11.5 12 11.5Z" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const EarningsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 17V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M15 10H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M15 14H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);


const AdminDashboard: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);

    const { students, loading: studentsLoading } = useSelector((state: RootState) => state.students);
    const { teachers, loading: teachersLoading } = useSelector((state: RootState) => state.teachers);
    const { drivers, loading: driversLoading } = useSelector((state: RootState) => state.drivers);
    const { attendance, loading: attendanceLoading } = useSelector((state: RootState) => state.attendance);
    const { events, loading: eventsLoading } = useSelector((state: RootState) => state.events);
    const { images: mainImages, loading: imagesLoading } = useSelector((state: RootState) => state.mainImages);
    const { fees: studentFees, loading: feesLoading } = useSelector((state: RootState) => state.studentFeesPay);
    const error = useSelector((state: RootState) => state.students.error || state.teachers.error || state.attendance.error || state.events.error || state.drivers.error || state.mainImages.error || state.studentFeesPay.error);


    const [attendanceTimeframe, setAttendanceTimeframe] = useState('this_week');
    const [attendanceClass, setAttendanceClass] = useState<string | null>(null);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchStudentsRequest(user.organization_key));
            dispatch(fetchTeachersRequest(user.organization_key));
            dispatch(fetchDriversRequest(user.organization_key));
            dispatch(fetchEventsRequest(user.organization_key));
            dispatch(fetchMainImagesRequest(user.organization_key));
            dispatch(fetchAllStudentFeesRequest(user.organization_key));
            
            const { startDate, endDate } = getTimeframeDates(attendanceTimeframe);
            dispatch(fetchAttendanceRequest({
                organizationKey: user.organization_key,
                startDate: startDate.format('YYYY-MM-DD'),
                endDate: endDate.format('YYYY-MM-DD'),
            }));
        }
    }, [dispatch, user?.organization_key, attendanceTimeframe]);
    
    const totalStudents = students.length;
    const totalTeachers = teachers.length;
    const totalDrivers = drivers.filter((d: Driver) => d.status === 'Active').length;
    const totalEarnings = studentFees.reduce((acc, fee) => acc + fee.paid_amount, 0);

    const genderData = {
        labels: ['Boys', 'Girls'],
        datasets: [{
            data: [
                students.filter(s => s.gender === 'Male').length,
                students.filter(s => s.gender === 'Female').length
            ],
            backgroundColor: ['#36A2EB', '#4BC0C0'],
            hoverBackgroundColor: ['#36A2EB', '#4BC0C0'],
            borderWidth: 0,
        }]
    };
    
    const getTimeframeDates = (timeframe: string) => {
        const today = dayjs();
        let startDate, endDate;
        if (timeframe === 'this_week') {
            startDate = today.startOf('week');
            endDate = today.endOf('week');
        } else { 
            startDate = today.subtract(1, 'week').startOf('week');
            endDate = today.subtract(1, 'week').endOf('week');
        }
        return { startDate, endDate };
    };

    const uniqueClasses = [...new Set(students.map(s => s.admitted_class).filter(Boolean))] as string[];

    const filteredAttendance = attendance.filter(att => {
        const classMatch = !attendanceClass || att.class === attendanceClass;
        return classMatch;
    });

    const attendanceChartData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'Total Present',
                data: Array(7).fill(0).map((_, i) => {
                    const day = getTimeframeDates(attendanceTimeframe).startDate.add(i, 'day');
                    return filteredAttendance.filter(a => dayjs(a.date).isSame(day, 'day') && a.attendace_status === 'Present').length;
                }),
                backgroundColor: '#36A2EB',
            },
            {
                label: 'Total Absent',
                data: Array(7).fill(0).map((_, i) => {
                     const day = getTimeframeDates(attendanceTimeframe).startDate.add(i, 'day');
                    return filteredAttendance.filter(a => dayjs(a.date).isSame(day, 'day') && a.attendace_status === 'Absent').length;
                }),
                backgroundColor: '#4BC0C0',
            }
        ]
    };
    
    const upcomingEvents = events.filter(event => event.status === 'Upcoming');

    const isLoading = studentsLoading || teachersLoading || attendanceLoading || eventsLoading || driversLoading || imagesLoading || feesLoading;

    if (isLoading) {
        return <Spin tip="Loading Dashboard..." fullscreen />;
    }

    if (error) {
        return <Alert message="Error" description={error} type="error" showIcon />;
    }

    return (
        <div>
            {mainImages.length > 0 && (
                <Card style={{ marginBottom: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} styles={{ body: { padding: 0 } }}>
                    <Carousel autoplay>
                        {mainImages.map(image => (
                            <div key={image.id}>
                                <img 
                                    src={image.image_url} 
                                    alt="Main Banner" 
                                    style={{ width: '100%', height: '300px', objectFit: 'cover' }}
                                />
                            </div>
                        ))}
                    </Carousel>
                </Card>
            )}

            <Row gutter={[24, 24]}>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard 
                        icon={<StudentsIcon />} 
                        title="Total Students" 
                        value={totalStudents} 
                        color="#4D70F1"
                        bgColor="#F0F5FF"
                    />
                </Col>
                 <Col xs={24} sm={12} lg={6}>
                    <StatCard 
                        icon={<TeachersIcon />} 
                        title="Total Teachers" 
                        value={totalTeachers} 
                        color="#4CAF50"
                        bgColor="#F0F9F0"
                    />
                </Col>
                 <Col xs={24} sm={12} lg={6}>
                    <StatCard 
                        icon={<EmployeeIcon />} 
                        title="Total Drivers" 
                        value={totalDrivers} 
                        color="#FFC107"
                        bgColor="#FFF9E6"
                    />
                </Col>
                 <Col xs={24} sm={12} lg={6}>
                    <StatCard 
                        icon={<EarningsIcon />} 
                        title="Total Earnings" 
                        value={`₹${totalEarnings.toLocaleString()}`} 
                        color="#F44336"
                        bgColor="#FFF1F0"
                    />
                </Col>

                <Col xs={24} lg={8}>
                    <Card style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                        <Title level={5}>Total Students by Gender</Title>
                        <Doughnut
                            data={genderData}
                            options={{
                                responsive: true,
                                cutout: '70%',
                                plugins: {
                                    legend: { display: false },
                                }
                            }}
                        />
                        <div style={{ textAlign: 'center', marginTop: '-120px', marginBottom: '80px' }}>
                           <Title level={2}>{totalStudents}</Title>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
                            <Text> <span style={{color: '#36A2EB'}}>■</span> Boys: {genderData.datasets[0].data[0]}</Text>
                            <Text> <span style={{color: '#4BC0C0'}}>■</span> Girls: {genderData.datasets[0].data[1]}</Text>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={16}>
                    <Card style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                        <Row justify="space-between" align="middle">
                            <Col><Title level={5}>Attendance</Title></Col>
                            <Col>
                                <Space wrap>
                                <Select value={attendanceTimeframe} onChange={setAttendanceTimeframe} style={{ marginRight: 8 }}>
                                    <Option value="this_week">This Week</Option>
                                    <Option value="last_week">Last Week</Option>
                                </Select>
                                <Select placeholder="Select Class" allowClear style={{ width: 120 }} onChange={setAttendanceClass}>
                                    {uniqueClasses.map(c => <Option key={c} value={c}>{c}</Option>)}
                                </Select>
                                </Space>
                            </Col>
                        </Row>
                        <Bar
                            data={attendanceChartData}
                            options={{
                                responsive: true,
                                scales: { y: { beginAtZero: true } },
                                plugins: {
                                    legend: { position: 'top', align: 'start' },
                                },
                            }}
                        />
                    </Card>
                </Col>
                
                <Col xs={24} lg={16}>
                     <Card 
                        title={<Title level={5} style={{margin: 0}}>Event Board</Title>}
                        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)', height: '100%' }}
                        styles={{ body: { height: 'calc(100% - 58px)', overflowY: 'auto', padding: '0 24px' } }}
                    >
                        <List
                            itemLayout="horizontal"
                            dataSource={upcomingEvents}
                            renderItem={(item, index) => (
                                <List.Item style={{padding: '12px 0'}}>
                                    <Row align="middle" style={{width: '100%'}} wrap={false}>
                                        <Col flex="50px">
                                            <Avatar 
                                                shape="square" 
                                                size={50} 
                                                src={item.image_url || 'https://placehold.co/50x50.png'} 
                                                data-ai-hint="event announcement"
                                            />
                                        </Col>
                                        <Col flex="auto" style={{padding: '0 16px', minWidth: 0 }}>
                                            <Typography.Link href="#" style={{color: 'inherit'}}>
                                                {item.title}
                                            </Typography.Link>
                                            <Text type="secondary" ellipsis style={{display: 'block'}}>{item.description}</Text>
                                        </Col>
                                        <Col flex="120px" style={{textAlign: 'center'}}>
                                            {index === 0 ? (
                                                <Button type="primary" size="small" style={{ borderRadius: 4, fontWeight: 'normal' }}>
                                                    {dayjs(item.event_date).format('DD MMMM, YYYY')}
                                                </Button>
                                            ) : (
                                                <Text type="secondary">{dayjs(item.event_date).format('DD MMMM, YYYY')}</Text>
                                            )}
                                        </Col>
                                        <Col flex="40px" style={{textAlign: 'right'}}>
                                            <Button type="text" shape="circle" icon={<MoreOutlined />} />
                                        </Col>
                                    </Row>
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                     <Card 
                        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)', height: '100%' }}
                        styles={{ body: { padding: 0 } }}
                     >
                         <Calendar 
                            fullscreen={false} 
                            headerRender={({ value, type, onChange, onTypeChange }) => (
                                <div style={{ padding: '12px' }}>
                                    <Row justify="space-between" align="middle">
                                        <Col>
                                            <Title level={5} style={{margin: 0}}>Event Calendar</Title>
                                        </Col>
                                        <Col>
                                            <Button type="text" shape="circle" icon={<MoreOutlined />} />
                                        </Col>
                                    </Row>
                                    <Row justify="space-between" align="middle" style={{marginTop: 12}}>
                                        <Col>
                                            <Button size="small" shape="circle" icon={<Typography.Text>{"<"}</Typography.Text>} onClick={() => onChange(value.clone().subtract(1, 'month'))} />
                                        </Col>
                                        <Col>
                                            <Typography.Text strong style={{cursor: 'pointer'}} onClick={() => onTypeChange(type === 'month' ? 'year' : 'month')}>{value.format('MMMM YYYY')}</Typography.Text>
                                        </Col>
                                        <Col>
                                            <Button size="small" shape="circle" icon={<Typography.Text>{">"}</Typography.Text>} onClick={() => onChange(value.clone().add(1, 'month'))}/>
                                        </Col>
                                    </Row>
                                </div>
                            )}
                         />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default AdminDashboard;
