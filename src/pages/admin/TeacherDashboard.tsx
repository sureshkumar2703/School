import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Text } = Typography;

const TeacherDashboard: React.FC = () => {
    
    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>Teacher Dashboard</Title>
            <Card>
                <Text>Welcome to your dashboard. This is the admin's view of a teacher's activity.</Text>
            </Card>
        </div>
    );
};

export default TeacherDashboard;