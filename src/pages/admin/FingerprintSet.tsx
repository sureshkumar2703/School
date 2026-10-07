
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Typography,
  Select,
  Input,
  Row,
  Col,
  Spin,
  Button,
  message,
  Image,
} from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeachersRequest } from '../../store/features/teachers/teachersSlice';
import { saveFingerprintsRequest } from '../../store/features/fingerprint/fingerprintSetSlice';

const { Title, Text } = Typography;
const { Option } = Select;

interface FingerprintState {
  scanned: boolean;
  quality: number | null;
  template?: string | null;
  image?: string | null;
}

const FINGER_COUNT = 5;

const FingerprintSet: React.FC = () => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [fingerprints, setFingerprints] = useState<FingerprintState[]>(
    () =>
      Array.from({ length: FINGER_COUNT }, () => ({
        scanned: false,
        quality: null,
        template: null,
        image: null,
      }))
  );
  const [isScanning, setIsScanning] = useState<number | null>(null); // finger index

  const dispatch: AppDispatch = useDispatch();

  const { user } = useSelector((state: RootState) => state.auth);
  const { teachers, loading: teachersLoading } = useSelector(
    (state: RootState) => state.teachers
  );
  const { loading: fingerprintLoading } = useSelector(
    (state: RootState) => state.fingerprintSet
  );

  useEffect(() => {
    if (user?.organization_key) {
      dispatch(fetchTeachersRequest(user.organization_key));
    }
  }, [dispatch, user?.organization_key]);

  const activeTeachers = useMemo(() => {
    return teachers.filter((teacher) => teacher.status === 'Active');
  }, [teachers]);

  const selectedTeacher = useMemo(() => {
    if (!selectedTeacherId) return null;
    return teachers.find((teacher) => teacher.id === selectedTeacherId);
  }, [teachers, selectedTeacherId]);

  const handleTeacherChange = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    setFingerprints(
      Array.from({ length: FINGER_COUNT }, () => ({
        scanned: false,
        quality: null,
        template: null,
        image: null,
      }))
    );
  };

  const handleCapture = async (index: number) => {
    if (!selectedTeacherId) {
      message.warning('Please select a teacher first.');
      return;
    }
    setIsScanning(index);

    // Simulate a successful scan after a short delay
    setTimeout(() => {
      const randomQuality = 70 + Math.floor(Math.random() * 31); // Quality between 70 and 100
      const newFingerprints = [...fingerprints];
      
      newFingerprints[index] = {
        scanned: true,
        quality: randomQuality,
        template: 'simulated_base64_template_string', // Mock data
        image: 'simulated_base64_image_string', // Mock data
      };
      setFingerprints(newFingerprints);

      message.success(
        `Finger ${index + 1} captured successfully (Quality: ${randomQuality})`
      );

      setIsScanning(null);
    }, 1500); // Simulate 1.5 seconds of scanning time
  };


  const handleSubmit = () => {
    if (!selectedTeacherId) {
      message.error('No teacher selected.');
      return;
    }
    const scannedFingers = fingerprints.filter((f) => f.scanned);
    if (scannedFingers.length === 0) {
      message.error('Please capture at least one fingerprint before submitting.');
      return;
    }

    // Prepare data to match the expected `FingerprintPayload` interface
    const fingerprintDataToSave = fingerprints.map((f, i) => ({
      fingerIndex: i + 1,
      scanned: f.scanned,
      quality: f.quality,
      template: f.template || null,
      image: f.image || null,
    }));

    dispatch(
      saveFingerprintsRequest({
        teacherId: selectedTeacherId,
        fingerprints: fingerprintDataToSave,
      })
    );
  };

  return (
    <Spin spinning={teachersLoading || fingerprintLoading} tip="Loading...">
      <Title level={4} style={{ marginBottom: 24 }}>
        Fingerprint Enrollment
      </Title>
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={6}>
            <Select
              showSearch
              placeholder="Select a Teacher"
              style={{ width: '100%' }}
              value={selectedTeacherId}
              onChange={handleTeacherChange}
              filterOption={(input, option) =>
                (option?.children as unknown as string)
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {activeTeachers.map((teacher) => (
                <Option key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <Input
              placeholder="Staff Code"
              value={selectedTeacher?.staff_code || ''}
              disabled
            />
          </Col>
          <Col xs={24} md={6}>
            <Input
              placeholder="Email"
              value={selectedTeacher?.email || ''}
              disabled
            />
          </Col>
          <Col xs={24} md={6}>
            <Input
              placeholder="Phone"
              value={selectedTeacher?.mobile_number || ''}
              disabled
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <Row gutter={[16, 16]} justify="center">
          {fingerprints.map((finger, index) => (
            <Col key={index} xs={12} sm={8} md={4}>
              <Card bodyStyle={{ textAlign: 'center', padding: '16px 8px' }}>
                <Spin spinning={isScanning === index} tip="Scanning...">
                  {finger.scanned ? (
                     <Image
                      width={120}
                      height={120}
                      src={`https://placehold.co/150x150/000000/52c41a?text=Captured`}
                      preview={false}
                      style={{ marginBottom: 16, borderRadius: 8 }}
                    />
                  ) : (
                    <Image
                      width={120}
                      height={120}
                      src={`https://placehold.co/150x150/000000/31C2F2?text=Scan`}
                      preview={false}
                      style={{ marginBottom: 16, borderRadius: 8 }}
                    />
                  )}
                </Spin>
                <Button
                  type="default"
                  onClick={() => handleCapture(index)}
                  disabled={!selectedTeacherId || isScanning !== null}
                  style={{ width: '100%', marginBottom: 8 }}
                >
                  Capture Finger {index + 1}
                </Button>
                <Text
                  type={
                    finger.quality && finger.quality >= 80 ? 'success' : 'warning'
                  }
                >
                  Quality: {finger.quality || 'N/A'}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
        <Row style={{ marginTop: 24 }}>
          <Col>
            <Button
              type="primary"
              size="large"
              onClick={handleSubmit}
              disabled={!selectedTeacherId || fingerprints.every((f) => !f.scanned)}
              loading={fingerprintLoading}
            >
              Submit Registration
            </Button>
          </Col>
        </Row>
      </Card>
    </Spin>
  );
};

export default FingerprintSet;
