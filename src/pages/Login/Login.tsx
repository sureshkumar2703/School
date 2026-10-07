
import { Form, Input, Button, Card, Typography, Row, Col, Alert, Spin } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { loginRequest } from '../../store/features/auth/authSlice';
import type { RootState } from '../../store/store';

const { Title, Text } = Typography;

const Login = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  
  const onFinish = (values: { email: string; password: string }) => {
    dispatch(loginRequest(values));
  };

  if (loading && !error) {
    return <Spin fullscreen tip="Logging in..." />;
  }

  return (
      <Row justify="center" align="middle" style={{ minHeight: '100vh', background: '#f0f2f5', padding: '16px' }}>
        <Col xs={24} sm={16} md={12} lg={8} xl={6}>
          <Card bordered={false} style={{ boxShadow: '0 4px 20px 0 rgba(0,0,0,0.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <Title level={2} style={{ fontWeight: 'bold' }}>Welcome Back!</Title>
                <Text type="secondary">Login to access your dashboard</Text>
            </div>
            <Form name="login" onFinish={onFinish} layout="vertical" requiredMark={false}>
              <Form.Item
                name="email"
                label="Email Address"
                rules={[{ required: true, message: 'Please input your email!', type: 'email' }]}
              >
                <Input prefix={<MailOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Email" size="large" />
              </Form.Item>
              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: 'Please input your password!' }]}
              >
                <Input.Password prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Password" size="large" />
              </Form.Item>
              {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24 }} closable />}
              <Form.Item>
                <Button type="primary" htmlType="submit" block loading={loading} size="large">
                  Log In
                </Button>
              </Form.Item>
              <Text style={{ display: 'block', textAlign: 'center' }}>
                Don't have an account? <Link to="/register">Register now</Link>
              </Text>
            </Form>
          </Card>
        </Col>
      </Row>
  );
};

export default Login;
