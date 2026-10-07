
import React, { useState, useEffect } from 'react';
import { Button, Card, Typography, Upload, message, Spin, Image, Popconfirm, Row, Col } from 'antd';
import { UploadOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { fetchMainImagesRequest, uploadMainImagesRequest, deleteMainImageRequest, type MainImage } from '../../store/features/main-images/mainImagesSlice';
import type { RcFile, UploadFile, UploadProps } from 'antd/es/upload';

const { Title, Text } = Typography;
const MAX_IMAGES = 5;

// Helper function to get base64 representation for image preview
const getBase64 = (file: RcFile): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });


const MainImages: React.FC = () => {
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { images, loading } = useSelector((state: RootState) => state.mainImages);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchMainImagesRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    const handleUpload = () => {
        if (fileList.length === 0) {
            message.error("Please select images to upload.");
            return;
        }
        if (!user?.organization_key) {
            message.error("Organization key not found. Cannot upload.");
            return;
        }

        const filesToUpload = fileList.map(f => f.originFileObj as File).filter(Boolean);
        dispatch(uploadMainImagesRequest({ organizationKey: user.organization_key, files: filesToUpload }));
        setFileList([]);
    };

    const handleDelete = (image: MainImage) => {
        if (!user?.organization_key) return;
        dispatch(deleteMainImageRequest({ 
            organizationKey: user.organization_key,
            imageId: image.id,
            imagePath: image.image_path 
        }));
    };

    const handlePreview = async (file: UploadFile) => {
        if (!file.url && !file.preview) {
            file.preview = await getBase64(file.originFileObj as RcFile);
        }
        // This opens the antd image preview modal
    };
    
    const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
        setFileList(newFileList);
    };

    const uploadProps: UploadProps = {
        listType: 'picture-card',
        fileList,
        multiple: true,
        onPreview: handlePreview,
        onChange: handleChange,
        beforeUpload: (file) => {
            const remainingSlots = MAX_IMAGES - images.length;
            if (fileList.length >= remainingSlots) {
                message.error(`You can only upload up to ${remainingSlots} more image(s).`);
                return Upload.LIST_IGNORE;
            }
            const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
            if (!isJpgOrPng) {
                message.error('You can only upload JPG/PNG file!');
            }
            const isLt2M = file.size / 1024 / 1024 < 2;
            if (!isLt2M) {
                message.error('Image must be smaller than 2MB!');
            }
            return isJpgOrPng && isLt2M ? false : Upload.LIST_IGNORE;
        },
    };
    
    const canUploadMore = images.length < MAX_IMAGES;
    const remainingSlots = MAX_IMAGES - images.length;

    return (
        <Card>
            <Title level={4}>Main Images</Title>
            <Text type="secondary">Upload up to {MAX_IMAGES} main promotional images for your organization.</Text>

            <Spin spinning={loading}>
                 <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                    {images.map(image => (
                        <Col key={image.id} xs={24} sm={12} md={8} lg={6}>
                            <Card
                                hoverable
                                cover={<Image alt="Main Image" src={image.image_url} style={{ height: 150, objectFit: 'cover' }} />}
                                actions={[
                                    <Popconfirm title="Delete this image?" onConfirm={() => handleDelete(image)}>
                                        <DeleteOutlined key="delete" style={{color: 'red'}} />
                                    </Popconfirm>
                                ]}
                            />
                        </Col>
                    ))}

                    {canUploadMore && (
                        <Col xs={24} sm={12} md={8} lg={6}>
                             <Upload {...uploadProps}>
                                <div>
                                    <PlusOutlined />
                                    <div style={{ marginTop: 8 }}>Upload ({fileList.length} / {remainingSlots})</div>
                                </div>
                            </Upload>
                        </Col>
                    )}
                </Row>
            </Spin>
            
             {fileList.length > 0 && (
                <div style={{ marginTop: 24, textAlign: 'right' }}>
                    <Button type="primary" icon={<UploadOutlined />} onClick={handleUpload} loading={loading}>
                        Upload Selected Images
                    </Button>
                </div>
            )}
        </Card>
    );
};

export default MainImages;