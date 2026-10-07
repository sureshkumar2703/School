
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Table, Space, Popconfirm, message, Spin, Alert, Card, Typography, Tag, Row, Col, Modal, Form, Input, DatePicker, Upload, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined, UploadOutlined, EyeOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import dayjs from 'dayjs';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import {
    fetchCircularsRequest,
    addCircularRequest,
    updateCircularRequest,
    deleteCircularRequest,
    type Circular,
    type AddCircularPayload as AddCircularPayloadType,
    type UpdateCircularPayload
} from '../../store/features/circulars/circularsSlice';


const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Helper function to normalize the file list for the form
const normFile = (e: any) => {
    if (Array.isArray(e)) {
        return e;
    }
    return e?.fileList;
};


const Circulars: React.FC = () => {
  const [form] = Form.useForm();
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingCircular, setEditingCircular] = useState<Circular | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewingCircular, setPreviewingCircular] = useState<Circular | null>(null);


  const dispatch: AppDispatch = useDispatch();
  const { circulars, loading, error } = useSelector((state: RootState) => state.circulars);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (user?.organization_key) {
      dispatch(fetchCircularsRequest(user.organization_key));
    }
  }, [dispatch, user?.organization_key]);

  const handleDelete = (circularToDelete: Circular) => {
    dispatch(deleteCircularRequest({
        circularId: circularToDelete.id,
        filePath: circularToDelete.file_path,
    }));
  };
  
   const showForm = (circular: Circular | null = null) => {
    setEditingCircular(circular);
    if (circular) {
        form.setFieldsValue({
            ...circular,
            issue_date: circular.issue_date ? dayjs(circular.issue_date) : null,
        });
        if (circular.file_url) {
            setFileList([{ uid: '-1', name: circular.file_path?.split('/').pop() || 'attachment.pdf', status: 'done', url: circular.file_url }]);
        } else {
            setFileList([]);
        }
    } else {
        form.resetFields();
        form.setFieldsValue({ issue_date: dayjs(), audience: ['All'], status: 'Active' });
        setFileList([]);
    }
    setIsFormVisible(true);
  }

  const hideForm = () => {
    setIsFormVisible(false);
    setEditingCircular(null);
    form.resetFields();
    setFileList([]);
  };

  const onFinish = (values: any) => {
    if (!user?.organization_key) {
      message.error("Organization information is missing. Cannot save circular.");
      return;
    }

    // Correctly get the file from the form values
    const fileToUpload = values.upload && values.upload.length > 0 ? values.upload[0].originFileObj : undefined;
    
    if (editingCircular) {
      const payload: UpdateCircularPayload = {
          id: editingCircular.id,
          organization_key: user.organization_key,
          title: values.title,
          content: values.content,
          audience: values.audience,
          issue_date: dayjs(values.issue_date).format('YYYY-MM-DD'),
          status: values.status,
          file: fileToUpload,
          old_file_path: editingCircular.file_path,
      };
      dispatch(updateCircularRequest(payload));
    } else {
      const payload: AddCircularPayloadType = {
          organization_key: user.organization_key,
          title: values.title,
          content: values.content,
          audience: values.audience,
          issue_date: dayjs(values.issue_date).format('YYYY-MM-DD'),
          status: values.status || 'Active',
          file: fileToUpload,
      };
      dispatch(addCircularRequest(payload));
    }
    hideForm();
  };

  const uploadProps: UploadProps = {
    onRemove: () => setFileList([]),
    beforeUpload: (file) => {
        const isPdf = file.type === 'application/pdf';
        if (!isPdf) {
            message.error('You can only upload PDF files!');
            return Upload.LIST_IGNORE;
        }
        setFileList([file]);
        return false;
    },
    fileList,
    maxCount: 1,
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'green';
      default: return 'default';
    }
  };

  const columns = [
    { title: 'Issue Date', dataIndex: 'issue_date', key: 'issue_date', render: (date: string) => dayjs(date).format('DD MMM YYYY'), width: 120 },
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'Audience', dataIndex: 'audience', key: 'audience', render: (audience: string[]) => audience?.map(aud => <Tag key={aud}>{aud}</Tag>) || <Tag>None</Tag>, width: 200 },
    { 
        title: 'Attachment', 
        dataIndex: 'file_url', 
        key: 'file_url', 
        render: (url: string, record: Circular) => url ? 
            <Button icon={<EyeOutlined />} type="link" onClick={() => setPreviewingCircular(record)}>View PDF</Button>
            : 'None', 
        width: 150 
    },
    {
      title: 'Action', key: 'action', width: 120, fixed: 'right' as const,
      render: (_: unknown, record: Circular) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => showForm(record)} />
          <Popconfirm title="Are you sure you want to delete this circular?" onConfirm={() => handleDelete(record)} okText="Yes" cancelText="No">
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const audienceOptions = ['All', 'Teachers', 'Students', 'Parents'];

  return (
    <>
    <Card>
      {isFormVisible ? (
          <div>
            <Button icon={<ArrowLeftOutlined />} onClick={hideForm} type="link" style={{ marginBottom: 16, paddingLeft: 0 }}>
                Back to Circulars List
            </Button>
            <Title level={4}>{editingCircular ? 'Edit Circular' : 'Create New Circular'}</Title>
             <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
                <Row gutter={16}>
                  <Col span={12}><Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item></Col>
                  <Col span={12}><Form.Item name="issue_date" label="Issue Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                  <Col span={24}><Form.Item name="content" label="Content / Description"><TextArea rows={4} /></Form.Item></Col>
                   <Col span={12}>
                        <Form.Item name="audience" label="Audience" rules={[{ required: true }]}>
                            <Select mode="multiple" allowClear placeholder="Select who will see this circular">
                                {audienceOptions.map(opt => <Option key={opt} value={opt}>{opt}</Option>)}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="status" label="Status" initialValue="Active" rules={[{ required: true }]}><Select><Option value="Active">Active</Option></Select></Form.Item>
                    </Col>
                    <Col span={12}>
                       <Form.Item name="upload" label="Attach PDF (Optional)" valuePropName="fileList" getValueFromEvent={normFile}>
                            <Upload {...uploadProps}>
                                <Button icon={<UploadOutlined />}>Select PDF</Button>
                            </Upload>
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
                  <Button onClick={hideForm} style={{ marginRight: 8 }}>Cancel</Button>
                  <Button type="primary" htmlType="submit" loading={loading}>{editingCircular ? 'Update' : 'Publish'}</Button>
                </Form.Item>
              </Form>
          </div>
      ) : (
        <>
          <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
            <Col><Title level={4} style={{ margin: 0 }}>Manage Circulars</Title></Col>
            <Col>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => showForm(null)}>
                Create Circular
              </Button>
            </Col>
          </Row>
          {error && <Alert message="Error" description={error} type="error" showIcon closable style={{ marginBottom: 16 }} />}
          <Spin spinning={loading}>
              <Table columns={columns} dataSource={circulars} rowKey="id" scroll={{ x: 'max-content' }} />
          </Spin>
        </>
      )}
    </Card>

    <Modal
        title={previewingCircular?.title}
        open={!!previewingCircular}
        onCancel={() => setPreviewingCircular(null)}
        footer={[<Button key="close" onClick={() => setPreviewingCircular(null)}>Close</Button>]}
        width="90vw"
        style={{ top: 20 }}
        bodyStyle={{ height: '80vh', overflow: 'hidden', padding: 0 }}
    >
        {previewingCircular?.file_url && (
            <object
                data={previewingCircular.file_url}
                type="application/pdf"
                width="100%"
                height="100%"
                aria-label={previewingCircular.title}
            >
                <div style={{ padding: '24px' }}>
                    <Text>It appears your browser does not support embedding this file type.</Text>
                     <br />
                     <a href={previewingCircular.file_url} download target="_blank" rel="noopener noreferrer">
                        <Button type="link">Click here to download the file instead.</Button>
                    </a>
                </div>
            </object>
        )}
    </Modal>
    </>
  );
};

export default Circulars;
