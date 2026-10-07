
import React from 'react';
import { Breadcrumb, Typography, Card, Row, Col, Button } from 'antd';
import { HomeOutlined, UserOutlined, FireOutlined, PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;

const CreateTeacherSalaryAllowcate: React.FC = () => {
    return (
        <div>
            <Breadcrumb style={{ marginBottom: 16 }}>
                <Breadcrumb.Item href="">
                    <HomeOutlined />
                </Breadcrumb.Item>
                <Breadcrumb.Item>
                    <UserOutlined />
                    <span>Admin</span>
                </Breadcrumb.Item>
                <Breadcrumb.Item>
                    <FireOutlined />
                    <span>Staff Salary Allocate</span>
                </Breadcrumb.Item>
            </Breadcrumb>
            <Card bodyStyle={{ padding: 0 }}>
                <Row justify="end">
                    <Col>
                        <Button type="primary" icon={<PlusOutlined />}>
                            Create
                        </Button>
                    </Col>
                </Row>
            </Card>
        </div>
    );
};

export default CreateTeacherSalaryAllowcate;
