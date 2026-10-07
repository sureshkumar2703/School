
import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Select, Table, Card, Typography, Spin, Row, Col, Empty, Input, Button, message, InputNumber } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchBusesRequest } from '../../store/features/buses/busSlice';
import { fetchDriversRequest } from '../../store/features/drivers/driversSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { fetchAllocationsRequest as fetchTransportAllocationsRequest, type StudentTransportAllocation } from '../../store/features/student-transport/studentTransportSlice';
import { createStudentTransportDataRequest, fetchAllStudentTransportDataRequest, updateStudentBusFeesRequest } from '../../store/features/student-transport-data/studentTransportDataSlice';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchBusFeesRequest } from '../../store/features/bus-fees/busFeesSlice';


const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

interface DisplayRecord {
    key: string;
    bus_number: string;
    vehicle_number?: string;
    seating_capacity?: number;
    from_address?: string;
    to_address?: string;
    full_name: string;
    phone_number: string;
}


const BussDriverAllocate: React.FC = () => {
    const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
    const [assignedSearchTerm, setAssignedSearchTerm] = useState('');
    const [selectedStudentRowKeys, setSelectedStudentRowKeys] = useState<React.Key[]>([]);
    const [busFees, setBusFees] = useState<number | null>(null);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | null>(null);


    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { buses, loading: busesLoading } = useSelector((state: RootState) => state.buses);
    const { drivers, loading: driversLoading } = useSelector((state: RootState) => state.drivers);
    const { details: schoolDetails, loading: schoolDetailsLoading } = useSelector((state: RootState) => state.schoolDetails);
    const { allocations: transportAllocations, loading: transportLoading } = useSelector((state: RootState) => state.studentTransport);
    const { allData: studentTransportData, loading: studentTransportDataLoading } = useSelector((state: RootState) => state.studentTransportData);
    const { calendars, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);
    const { busFees: setupFees, loading: setupFeesLoading } = useSelector((state: RootState) => state.busFees);


    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchBusesRequest(user.organization_key));
            dispatch(fetchDriversRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
            dispatch(fetchTransportAllocationsRequest(user.organization_key));
            dispatch(fetchAllStudentTransportDataRequest(user.organization_key));
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
            dispatch(fetchBusFeesRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);
    
    useEffect(() => {
        // Set the default academic year when calendars load
        if (calendars.length > 0 && !selectedAcademicYear) {
            const currentYear = calendars.find(c => c.is_current)?.academic_year;
            setSelectedAcademicYear(currentYear || calendars[0].academic_year);
        }
    }, [calendars, selectedAcademicYear]);

    // Automatically find and set the bus fee when bus or academic year changes
    useEffect(() => {
        if (selectedBusId && selectedAcademicYear && setupFees.length > 0) {
            const feeRecord = setupFees.find(f => 
                f.bus_id === selectedBusId && 
                f.academic_year === selectedAcademicYear && 
                f.status === 'Active'
            );
            if (feeRecord) {
                setBusFees(feeRecord.fees);
            } else {
                setBusFees(null);
            }
        } else {
            setBusFees(null);
        }
    }, [selectedBusId, selectedAcademicYear, setupFees]);


    const activeBuses = buses.filter(b => b.status === 'Active');
    const activeDrivers = drivers.filter(d => d.status === 'Active');

    const tableData = useMemo(() => {
        if (!selectedBusId || !selectedDriverId) {
            return [];
        }

        const selectedBus = buses.find(b => b.id === selectedBusId);
        const selectedDriver = drivers.find(d => d.id === selectedDriverId);

        if (!selectedBus || !selectedDriver) {
            return [];
        }

        const displayRecord: DisplayRecord = {
            key: `${selectedBus.id}-${selectedDriver.id}`,
            bus_number: selectedBus.bus_number,
            vehicle_number: selectedBus.vehicle_number,
            seating_capacity: selectedBus.seating_capacity,
            from_address: selectedBus.route_address,
            to_address: schoolDetails?.address,
            full_name: selectedDriver.full_name,
            phone_number: selectedDriver.phone_number,
        };

        return [displayRecord];
    }, [selectedBusId, selectedDriverId, buses, drivers, schoolDetails]);
    
     const activeStudentAllocationsForFilters = useMemo(() => {
        if (!selectedAcademicYear) return [];
        return transportAllocations.filter(alloc => 
            alloc.academic_year === selectedAcademicYear && alloc.status === 'Active'
        );
    }, [transportAllocations, selectedAcademicYear]);

    const filteredActiveStudentAllocations = useMemo(() => {
        let filtered = activeStudentAllocationsForFilters;

        if (assignedSearchTerm) {
            filtered = filtered.filter(alloc =>
                (alloc.full_name?.toLowerCase().includes(assignedSearchTerm.toLowerCase())) ||
                (alloc.roll_no?.toLowerCase().includes(assignedSearchTerm.toLowerCase()))
            );
        }
        
        return filtered.sort((a, b) => (a.roll_no || '').localeCompare(b.roll_no || ''));
    }, [activeStudentAllocationsForFilters, assignedSearchTerm]);
    
     const alreadyAssignedStudentIds = useMemo(() => {
        if (!selectedAcademicYear) return new Set();
        return new Set(
            studentTransportData
                .filter(d => d.academic_year === selectedAcademicYear)
                .map(d => d.student_id)
        );
    }, [studentTransportData, selectedAcademicYear]);


    const columns: ColumnsType<DisplayRecord> = [
        { title: 'Bus Number', dataIndex: 'bus_number', key: 'bus_number' },
        { title: 'Vehicle Number', dataIndex: 'vehicle_number', key: 'vehicle_number' },
        { title: 'From Address (Route)', dataIndex: 'from_address', key: 'from_address' },
        { title: 'To Address (School)', dataIndex: 'to_address', key: 'to_address' },
        { title: 'Seating Capacity', dataIndex: 'seating_capacity', key: 'seating_capacity' },
        { title: 'Driver Name', dataIndex: 'full_name', key: 'full_name' },
        { title: 'Driver Contact', dataIndex: 'phone_number', key: 'phone_number' },
    ];
    
     const studentAllocationColumns: ColumnsType<StudentTransportAllocation> = [
        { title: 'Roll No', dataIndex: 'roll_no', key: 'roll_no', render: text => text || 'N/A' },
        { title: 'Full Name', dataIndex: 'full_name', key: 'full_name' },
        { title: 'Class', dataIndex: 'class_name', key: 'class_name' },
        { title: 'Section', dataIndex: 'section_name', key: 'section_name' },
        { title: 'Permanent Address', dataIndex: 'permanent_address', key: 'permanent_address', render: (text) => text || 'N/A' },
        { title: 'Temporary Address', dataIndex: 'temporary_address', key: 'temporary_address', render: (text) => text || 'N/A' },
    ];

    const onStudentSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedStudentRowKeys(newSelectedRowKeys);
    };


    const studentRowSelection = {
        selectedRowKeys: selectedStudentRowKeys,
        onChange: onStudentSelectChange,
         getCheckboxProps: (record: StudentTransportAllocation) => ({
            disabled: alreadyAssignedStudentIds.has(record.student_id),
            name: record.full_name,
        }),
    };
    
    const handleSave = () => {
        if (!user?.organization_key || !selectedAcademicYear || tableData.length === 0 || selectedStudentRowKeys.length === 0) {
            message.error("Please select a bus, a driver, an academic year and at least one student.");
            return;
        }

        const busAndDriverInfo = tableData[0];
        const selectedBus = buses.find(b => b.id === selectedBusId);
        
        if (!selectedBus || typeof selectedBus.seating_capacity !== 'number') {
            message.error("Could not determine the seating capacity for the selected bus.");
            return;
        }

        if (busFees === null) {
            message.error("Bus fees not set for this bus and academic year. Please go to Bus Fees Setup first.");
            return;
        }

        const existingAssignmentsCount = studentTransportData.filter(d => 
            d.bus_id === selectedBusId && d.academic_year === selectedAcademicYear
        ).length;

        const availableSeats = selectedBus.seating_capacity - existingAssignmentsCount;

        if (selectedStudentRowKeys.length > availableSeats) {
            message.error(`Seat capacity exceeded. Only ${availableSeats} seat(s) remaining on this bus.`);
            return;
        }

        const selectedStudents = filteredActiveStudentAllocations.filter(student =>
            selectedStudentRowKeys.includes(student.id)
        );

        const dataToSave = selectedStudents.map(student => ({
            organization_key: user.organization_key!,
            bus_no: busAndDriverInfo.bus_number,
            vehicle_no: busAndDriverInfo.vehicle_number,
            from_address: busAndDriverInfo.from_address,
            to_address: busAndDriverInfo.to_address,
            seating_capacity: busAndDriverInfo.seating_capacity,
            driver_name: busAndDriverInfo.full_name,
            driver_contact: busAndDriverInfo.phone_number,
            roll_no: student.roll_no,
            student_name: student.full_name,
            academic_year: student.academic_year,
            class: student.class_name,
            section: student.section_name,
            current_address: student.permanent_address || student.temporary_address,
            status: 'Active',
            student_id: student.student_id,
            bus_id: selectedBusId,
            driver_id: selectedDriverId,
            bus_fees: busFees, 
        }));
        
        dispatch(createStudentTransportDataRequest(dataToSave as any));

        const newlyAssignedCount = selectedStudents.length;
        const remainingSeats = availableSeats - newlyAssignedCount;
        message.success(`${newlyAssignedCount} students assigned. ${remainingSeats} seats remaining on this bus.`);

        setSelectedStudentRowKeys([]);
    };
    
    const handleUpdateFees = () => {
        if (!user?.organization_key || !selectedAcademicYear || busFees === null || busFees < 0 || selectedStudentRowKeys.length === 0) {
            message.error("Please select students and ensure a valid bus fee is loaded to update.");
            return;
        }
        
        const studentIdsToUpdate: string[] = [];
        selectedStudentRowKeys.forEach(key => {
            const student = filteredActiveStudentAllocations.find(s => s.id === key);
            if (student?.student_id) {
                studentIdsToUpdate.push(student.student_id);
            }
        });
        
        if (studentIdsToUpdate.length === 0) {
            message.warning("No valid students found for fee update.");
            return;
        }
        
        dispatch(updateStudentBusFeesRequest({
            studentIds: studentIdsToUpdate,
            busFees: busFees,
            academicYear: selectedAcademicYear,
        }));

        setSelectedStudentRowKeys([]);
    };

    const hasSelected = selectedStudentRowKeys.length > 0;
    const isLoading = busesLoading || driversLoading || schoolDetailsLoading || transportLoading || studentTransportDataLoading || calendarsLoading || setupFeesLoading;

    return (
        <Card>
            <Title level={4}>Bus &amp; Driver Allocation Preview</Title>
            <Text>Select an academic year, bus, and driver to view their combined details.</Text>
            <Spin spinning={isLoading}>
                <Row gutter={[16, 16]} style={{ marginTop: 24, marginBottom: 24 }}>
                    <Col xs={24} sm={12} md={8}>
                        <Select
                            placeholder="Select Academic Year"
                            style={{ width: '100%' }}
                            value={selectedAcademicYear}
                            onChange={setSelectedAcademicYear}
                            loading={calendarsLoading}
                        >
                            {calendars.map(year => (
                                <Option key={year.id} value={year.academic_year}>
                                    {year.academic_year}{year.is_current && " (Current)"}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <Select
                            showSearch
                            placeholder="Select a Bus"
                            style={{ width: '100%' }}
                            value={selectedBusId}
                            onChange={setSelectedBusId}
                            loading={busesLoading}
                            allowClear
                            filterOption={(input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {activeBuses.map(bus => (
                                <Option key={bus.id} value={bus.id}>
                                    {`Bus No: ${bus.bus_number} (Vehicle: ${bus.vehicle_number})`}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <Select
                            showSearch
                            placeholder="Select a Driver"
                            style={{ width: '100%' }}
                            value={selectedDriverId}
                            onChange={setSelectedDriverId}
                            loading={driversLoading}
                            allowClear
                             filterOption={(input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {activeDrivers.map(driver => (
                                <Option key={driver.id} value={driver.id}>
                                    {`${driver.full_name} (${driver.phone_number})`}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                </Row>
            </Spin>

            <Title level={5} style={{ marginTop: 16 }}>Preview Details</Title>
            <div style={{ overflowX: 'auto' }}>
                <Table
                    columns={columns}
                    dataSource={tableData}
                    rowKey="key"
                    loading={isLoading}
                    bordered
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: <Empty description="Please select an academic year, bus, and driver to see details." /> }}
                />
            </div>
            
            {tableData.length > 0 && selectedAcademicYear && (
                <>
                    <Title level={5} style={{ marginTop: 32 }}>Active Student Transport Assignments ({selectedAcademicYear})</Title>
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }} align="bottom">
                        <Col xs={24} sm={12} md={8}>
                            <Search
                                allowClear
                                placeholder="Search by Name or Roll No"
                                value={assignedSearchTerm}
                                onChange={(e) => setAssignedSearchTerm(e.target.value)}
                                style={{ width: '100%' }}
                            />
                        </Col>
                        {hasSelected && (
                             <>
                                <Col xs={24} sm={12} md={8}>
                                    <Text>Bus Fees</Text>
                                    <InputNumber
                                        placeholder="Fees from setup"
                                        style={{ width: '100%' }}
                                        value={busFees}
                                        disabled={true}
                                        min={0}
                                        formatter={(value) => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                        parser={(value) => Number(value!.replace(/₹\s?|(,*)/g, ''))}
                                    />
                                    {busFees === null && <Text type="danger" style={{ fontSize: '12px' }}>Fees not set for this bus in selected year.</Text>}
                                </Col>
                                <Col xs={24} sm={12} md={4}>
                                    <Button type="primary" onClick={handleSave} loading={studentTransportDataLoading} block disabled={busFees === null}>
                                        Assign ({selectedStudentRowKeys.length})
                                    </Button>
                                </Col>
                                <Col xs={24} sm={12} md={4}>
                                    <Button type="default" onClick={handleUpdateFees} loading={studentTransportDataLoading} disabled={busFees === null} block>
                                        Save Fees
                                    </Button>
                                </Col>
                            </>
                        )}
                    </Row>
                    <div style={{ overflowX: 'auto' }}>
                        <Table
                            rowSelection={studentRowSelection}
                            columns={studentAllocationColumns}
                            dataSource={filteredActiveStudentAllocations}
                            rowKey="id"
                            loading={isLoading}
                            bordered
                            pagination={{ pageSize: 10 }}
                            scroll={{ x: 'max-content' }}
                            locale={{ emptyText: <Empty description="No active student transport assignments for the current academic year." /> }}
                        />
                    </div>
                </>
            )}
        </Card>
    );
};

export default BussDriverAllocate;
