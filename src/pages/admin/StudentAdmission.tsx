import { useState } from 'react';
import { Button, Card, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import StudentForm from './StudentForm';

const { Title, Text } = Typography;

const StudentAdmission = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showAddModal = () => {
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
  };

  return (
    <>
      <Card>
        <Title level={4}>Student Admission</Title>
        <Text type="secondary">
          Click the button below to open the admission form and add a new student to the system.
        </Text>
        <br />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={showAddModal}
          style={{ marginTop: 16 }}
        >
          Add New Student
        </Button>
      </Card>

      <StudentForm
        visible={isModalVisible}
        onClose={handleModalClose}
        student={null}
      />
    </>
  );
};

export default StudentAdmission;
