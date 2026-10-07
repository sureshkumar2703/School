import React, { useState, useEffect } from 'react';
import { Button, Card, Typography, Modal, Form, Input, Row, Col, Select, message, Spin, Descriptions, Upload, Image, Grid } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { saveSchoolDetailsRequest, fetchSchoolDetailsRequest, type SchoolDetails, type SaveDetailsPayload } from '../../store/features/school-details/schoolDetailsSlice';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

const SchoolDetailsPage: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [form] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();
    const screens = useBreakpoint();
    
    const { details, loading, error } = useSelector((state: RootState) => state.schoolDetails);
    const { user } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        if (details) {
            form.setFieldsValue(details);
            if (details.logo_url) {
                setFileList([{
                    uid: '-1',
                    name: 'logo.png',
                    status: 'done',
                    url: details.logo_url
                }]);
            } else {
                 setFileList([]);
            }
        }
    }, [details, form]);

    const showModal = () => {
        if (details) {
            form.setFieldsValue(details);
        } else {
            form.resetFields();
        }
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    const onFinish = (values: Omit<SchoolDetails, 'id' | 'organization_key' | 'created_at' | 'admin_id' | 'logo_url' | 'logo_path'>) => {
        if (!user?.organization_key) {
            message.error("User or Organization key not found. Cannot save details.");
            return;
        }

        const payload: SaveDetailsPayload = {
            details: {
                id: details?.id,
                ...values,
                organization_key: user.organization_key,
                admin_id: user.id,
            },
            logoFile: fileList.length > 0 && fileList[0].originFileObj ? fileList[0].originFileObj : undefined,
            logo_path: details?.logo_path
        };
        
        dispatch(saveSchoolDetailsRequest(payload));
        handleCancel();
    };
    
    const handleUploadChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
        setFileList(newFileList);
    };

     const uploadProps: UploadProps = {
        listType: 'picture-card',
        fileList: fileList,
        onChange: handleUploadChange,
        beforeUpload: (file) => {
            const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
            if (!isJpgOrPng) {
                message.error('You can only upload JPG/PNG file!');
            }
            const isLt2M = file.size / 1024 / 1024 < 2;
            if (!isLt2M) {
                message.error('Image must be smaller than 2MB!');
            }
            // Prevent auto-upload
            return false;
        },
        maxCount: 1,
    };


    const pageTitle = details?.id ? "Edit School Details" : "Add School Details";
    const buttonIcon = details?.id ? <EditOutlined /> : <PlusOutlined />;

    return (
        <>
            <Card>
                <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                    <Col>
                        <Title level={4} style={{ margin: 0 }}>School Information</Title>
                    </Col>
                    <Col>
                        <Button type="primary" icon={buttonIcon} onClick={showModal}>
                            {pageTitle}
                        </Button>
                    </Col>
                </Row>
                
                <Spin spinning={loading}>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    {details ? (
                        <Descriptions bordered column={screens.md ? 2 : 1}>
                            <Descriptions.Item label="Logo" span={screens.md ? 2 : 1}>
                                {details.logo_url ? <Image width={100} src={details.logo_url} /> : 'No Logo'}
                            </Descriptions.Item>
                            <Descriptions.Item label="School Name">{details.school_name}</Descriptions.Item>
                            <Descriptions.Item label="Principal’s Name">{details.principal_name}</Descriptions.Item>
                            <Descriptions.Item label="Official Address" span={screens.md ? 2 : 1}>{details.address}</Descriptions.Item>
                            <Descriptions.Item label="Address for Map" span={screens.md ? 2 : 1}>{details.map_address || 'Same as official address'}</Descriptions.Item>
                            <Descriptions.Item label="Phone Number">{details.phone_number}</Descriptions.Item>
                            <Descriptions.Item label="Email Address">{details.email}</Descriptions.Item>
                            <Descriptions.Item label="Website">{details.website}</Descriptions.Item>
                            <Descriptions.Item label="Established Year">{details.established_year}</Descriptions.Item>
                            <Descriptions.Item label="School Type">{details.school_type}</Descriptions.Item>
                            <Descriptions.Item label="Affiliation / Board">{details.affiliation}</Descriptions.Item>
                            <Descriptions.Item label="Tagline">{details.tagline}</Descriptions.Item>
                            <Descriptions.Item label="About School" span={screens.md ? 2 : 1}>{details.about_school}</Descriptions.Item>
                        </Descriptions>
                    ) : (
                        <p>No school details found. Please add them.</p>
                    )}
                </Spin>

            </Card>

            <Modal 
                title={pageTitle}
                open={isModalVisible} 
                onCancel={handleCancel}
                footer={null}
                width={800}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item label="School Logo">
                                <Upload {...uploadProps}>
                                    {fileList.length === 0 && (
                                        <div>
                                            <PlusOutlined />
                                            <div style={{ marginTop: 8 }}>Upload</div>
                                        </div>
                                    )}
                                </Upload>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="school_name" label="School Name" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="principal_name" label="Principal’s Name" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item name="address" label="Official School Address" rules={[{ required: true }]}>
                                <TextArea rows={3} />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item name="map_address" label="Address for Map (Optional)" help="If different from the official address. You can use GPS coordinates for accuracy.">
                                <TextArea rows={2} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="phone_number" label="Phone Number" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="email" label="Email Address" rules={[{ required: true, type: 'email' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                         <Col span={12}>
                            <Form.Item name="website" label="Website">
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="established_year" label="Established Year" rules={[{ required: true }]}>
                                <Input type="number" />
                            </Form.Item>
                        </Col>
                         <Col span={12}>
                            <Form.Item name="school_type" label="School Type" rules={[{ required: true }]}>
                                <Select placeholder="e.g., Public, Private, International">
                                    <Option value="Public">Public</Option>
                                    <Option value="Private">Private</Option>
                                    <Option value="International">International</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                         <Col span={12}>
                            <Form.Item name="affiliation" label="Affiliation / Board" rules={[{ required: true }]}>
                                 <Select placeholder="e.g., CBSE, ICSE, State Board">
                                    <Option value="CBSE">CBSE</Option>
                                    <Option value="ICSE">ICSE</Option>
                                    <Option value="State Board">State Board</Option>
                                    <Option value="IB">IB</Option>
                                    <Option value="Other">Other</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item name="tagline" label="Tagline">
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                             <Form.Item name="about_school" label="About School">
                                <TextArea rows={4} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row justify="end" style={{ marginTop: 24 }}>
                        <Button onClick={handleCancel} style={{ marginRight: 8 }}>
                            Cancel
                        </Button>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            Save
                        </Button>
                    </Row>
                </Form>
            </Modal>
        </>
    );
};

export default SchoolDetailsPage;
