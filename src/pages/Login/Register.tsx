
import { useState } from 'react';
import { Form, Input, Button, Card, Typography, Row, Col, Alert, Steps, Spin, message } from 'antd';
import { KeyOutlined, UserOutlined, MailOutlined, PhoneOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useHistory } from 'react-router-dom';
import { supabase } from '../../service/supabaseClient';

const { Title, Text } = Typography;
const { Step } = Steps;

const Register = () => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizationKey, setOrganizationKey] = useState('');
  const history = useHistory();

  const handleKeyCheck = async (values: { organizationKey: string }) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, status')
        .eq('organization_key', values.organizationKey)
        .single();
      
      if (error || !data) {
        throw new Error('Invalid or non-existent organization key.');
      }
      if (data.status !== 'Active') {
        throw new Error('This organization is not currently active.');
      }
      
      setOrganizationKey(values.organizationKey);
      setCurrentStep(1);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async (values: any) => {
    setLoading(true);
    setError(null);
    try {
        // Direct insert into admin_data table without Supabase Auth
        const { error: insertError } = await supabase.from('admin_data').insert({
            name: values.name,
            phone: values.phone,
            email: values.email,
            password: values.password, // Storing password directly. Ensure you have RLS policies.
            organization_key: organizationKey,
            status: 'Inactive',
        });

        if (insertError) {
             if (insertError.message.includes('unique constraint')) {
                throw new Error('An admin with this email already exists for this organization.');
            }
            throw insertError;
        }
        
        message.success("Registration successful! Your account is pending activation by a superadmin.", 5);
        form.resetFields();
        history.push('/login');

    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };
  
  const goBack = () => {
    setCurrentStep(0);
    setError(null);
    form.resetFields(['name', 'phone', 'email', 'password']);
  };

  return (
    <Row justify="center" align="middle" style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Col xs={22} sm={16} md={12} lg={8} xl={7}>
        <Card bordered={false} style={{ boxShadow: '0 4px 20px 0 rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Title level={2} style={{ fontWeight: 'bold' }}>Create Your Account</Title>
            <Steps current={currentStep} size="small" style={{ marginTop: '24px' }}>
              <Step title="Verify Key" />
              <Step title="Register" />
            </Steps>
          </div>
          <Spin spinning={loading} tip="Please wait...">
            {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24 }} closable onClose={() => setError(null)} />}

            {currentStep === 0 && (
              <Form 
                name="verify"
                form={form} 
                onFinish={handleKeyCheck} 
                layout="vertical"
              >
                <Form.Item
                  name="organizationKey"
                  label="Organization Key"
                  rules={[{ required: true, message: 'Please input your organization key!' }]}
                >
                  <Input prefix={<KeyOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Enter your organization key" size="large" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" block size="large" disabled={loading}>
                    Next
                  </Button>
                </Form.Item>
              </Form>
            )}

            {currentStep === 1 && (
              <Form name="register" form={form} onFinish={handleRegistration} layout="vertical">
                 <Button type="link" icon={<ArrowLeftOutlined />} onClick={goBack} style={{ padding: '0 0 16px 0' }}>
                    Back
                 </Button>
                <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                  <Input prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Full Name" size="large" />
                </Form.Item>
                <Form.Item name="phone" label="Phone Number" rules={[{ required: true }, { len: 10, message: "Phone number must be 10 digits." }]}>
                  <Input prefix={<PhoneOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Phone Number" size="large" maxLength={10} />
                </Form.Item>
                <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                  <Input prefix={<MailOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Email" size="large" />
                </Form.Item>
                <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
                  <Input.Password prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Password" size="large" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                    Register
                  </Button>
                </Form.Item>
              </Form>
            )}
            <Text style={{ display: 'block', textAlign: 'center' }}>
              Already have an account? <Link to="/login">Log in</Link>
            </Text>
          </Spin>
        </Card>
      </Col>
    </Row>
  );
};

export default Register;
