
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Table, Space, Popconfirm, message, Spin, Alert, Card, Typography, Tag, Row, Col, Tabs, Image, Form, Input, DatePicker, Upload, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined, UploadOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchEventsRequest, deleteEventRequest, addEventRequest, updateEventRequest, type Event, type AddEventPayload, type UpdateEventPayload } from '../../store/features/events/eventsSlice';
import dayjs from 'dayjs';
import type { UploadFile, UploadProps, RcFile } from 'antd/es/upload';

const { Title } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const Events: React.FC = () => {
  const [form] = Form.useForm();
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const dispatch: AppDispatch = useDispatch();
  const { events, loading, error } = useSelector((state: RootState) => state.events);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (user?.organization_key) {
      dispatch(fetchEventsRequest(user.organization_key));
    }
  }, [dispatch, user?.organization_key]);

  const handleDelete = (eventToDelete: Event) => {
    dispatch(deleteEventRequest({ 
        eventId: eventToDelete.id,
        filePath: eventToDelete.file_path,
    }));
  };

  const showForm = (event: Event | null) => {
    setEditingEvent(event);
    if (event) {
        form.setFieldsValue({
            ...event,
            event_date: event.event_date ? dayjs(event.event_date) : null,
        });
        if (event.image_url) {
            setFileList([{ uid: '-1', name: 'image.png', status: 'done', url: event.image_url }]);
        } else {
            setFileList([]);
        }
    } else {
        form.resetFields();
        form.setFieldsValue({ status: 'Upcoming' });
        setFileList([]);
    }
    setIsFormVisible(true);
  }

  const hideForm = () => {
    setIsFormVisible(false);
    setEditingEvent(null);
    form.resetFields();
    setFileList([]);
  };

  const onFinish = (values: any) => {
    if (!user?.organization_key) {
      message.error("Organization information is missing. Cannot save event.");
      return;
    }

    const fileToUpload = fileList.length > 0 && fileList[0].originFileObj ? fileList[0].originFileObj : undefined;

    if (editingEvent) {
      const payload: UpdateEventPayload = {
          id: editingEvent.id,
          organizationKey: user.organization_key,
          title: values.title,
          description: values.description,
          event_date: dayjs(values.event_date).format('YYYY-MM-DD'),
          status: values.status,
          file: fileToUpload,
          old_file_path: editingEvent.file_path, // Pass old path for deletion
      };
      dispatch(updateEventRequest(payload));
    } else {
      const payload: AddEventPayload = {
          organizationKey: user.organization_key,
          title: values.title,
          description: values.description,
          event_date: dayjs(values.event_date).format('YYYY-MM-DD'),
          status: values.status,
          file: fileToUpload,
      };
      dispatch(addEventRequest(payload));
    }
    hideForm();
  };

  const uploadProps: UploadProps = {
    onRemove: () => setFileList([]),
    beforeUpload: (file) => {
        const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
        if (!isJpgOrPng) {
            message.error('You can only upload JPG/PNG file!');
        }
        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            message.error('Image must smaller than 2MB!');
        }
        if (isJpgOrPng && isLt2M) {
           setFileList([{
               uid: file.uid,
               name: file.name,
               status: 'done',
               originFileObj: file as RcFile,
               url: URL.createObjectURL(file),
           }]);
        }
        return false;
    },
    fileList,
    listType: "picture",
    maxCount: 1,
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Upcoming': return 'blue';
      case 'Completed': return 'green';
      case 'Cancelled': return 'red';
      default: return 'default';
    }
  };

  const baseColumns = [
    { 
      title: 'Image',
      dataIndex: 'image_url',
      key: 'image_url',
      width: 100,
      render: (url: string) => url ? <Image src={url} width={50} height={50} style={{ objectFit: 'cover' }} data-ai-hint="event announcement" /> : 'No Image'
    },
    { title: 'Event Title', dataIndex: 'title', key: 'title', width: 250 },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true, width: '35%' },
    { title: 'Event Date', dataIndex: 'event_date', key: 'event_date', width: 150, render: (date: string) => dayjs(date).format('DD MMM YYYY') },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (status: string) => <Tag color={getStatusColor(status)}>{status}</Tag> },
  ];

  const actionColumn = {
    title: 'Action', key: 'action', fixed: 'right' as const, width: 120,
    render: (_: unknown, record: Event) => (
      <Space size="middle">
        <Button icon={<EditOutlined />} onClick={() => showForm(record)} />
        <Popconfirm title="Are you sure you want to delete this event?" onConfirm={() => handleDelete(record)} okText="Yes" cancelText="No">
          <Button icon={<DeleteOutlined />} danger />
        </Popconfirm>
      </Space>
    ),
  };

  const renderTable = (status: 'Upcoming' | 'Completed' | 'Cancelled') => {
      const filteredEvents = events.filter(event => event.status === status);
      const tableColumns = [...baseColumns, actionColumn];
      
      return (
        <Table
            columns={tableColumns}
            dataSource={filteredEvents}
            rowKey="id"
            scroll={{ x: 'max-content' }}
        />
      )
  }

  return (
    <Card>
      {isFormVisible ? (
          <div>
            <Button icon={<ArrowLeftOutlined />} onClick={hideForm} type="link" style={{ marginBottom: 16, paddingLeft: 0 }}>
                Back to Events List
            </Button>
            <Title level={4}>{editingEvent ? 'Edit Event' : 'Create New Event'}</Title>
             <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="title" label="Event Title" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="event_date" label="Event Date" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="description" label="Description">
                        <TextArea rows={4} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                        <Select>
                            <Option value="Upcoming">Upcoming</Option>
                            <Option value="Completed">Completed</Option>
                            <Option value="Cancelled">Cancelled</Option>
                        </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Event Image">
                        <Upload {...uploadProps}>
                            <Button icon={<UploadOutlined />}>Select Image</Button>
                        </Upload>
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
                   <Space>
                        <Button onClick={hideForm}>
                            Cancel
                        </Button>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            {editingEvent ? 'Update Event' : 'Create Event'}
                        </Button>
                   </Space>
                </Form.Item>
              </Form>
          </div>
      ) : (
        <>
          <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
            <Col>
                <Title level={4} style={{ margin: 0 }}>Event Management</Title>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => showForm(null)}
              >
                Create Event
              </Button>
            </Col>
          </Row>
          {error && <Alert message="Error" description={error} type="error" showIcon closable style={{ marginBottom: 16 }} />}
          <Spin spinning={loading}>
              <Tabs defaultActiveKey="1">
                  <TabPane tab="Upcoming" key="1">
                    {renderTable('Upcoming')}
                  </TabPane>
                  <TabPane tab="Completed" key="2">
                    {renderTable('Completed')}
                  </TabPane>
                  <TabPane tab="Cancelled" key="3">
                    {renderTable('Cancelled')}
                  </TabPane>
              </Tabs>
          </Spin>
        </>
      )}
    </Card>
  );
};

export default Events;
