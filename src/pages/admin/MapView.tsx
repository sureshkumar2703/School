
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Typography, Spin, Alert, Empty, Input, Button, Row, Col, message } from 'antd';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchSchoolDetailsRequest, saveSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';

const { Title, Text } = Typography;

const MapView: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { details: schoolDetails, loading, error } = useSelector((state: RootState) => state.schoolDetails);
    
    const [manualAddress, setManualAddress] = useState('');
    const [displayAddress, setDisplayAddress] = useState('');

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        const initialAddress = schoolDetails?.map_address || schoolDetails?.address;
        if (initialAddress) {
            setDisplayAddress(initialAddress);
            setManualAddress(initialAddress);
        }
    }, [schoolDetails]);

    const handleUpdateMap = () => {
        setDisplayAddress(manualAddress);
    };

    const handleSaveLocation = () => {
        if (!schoolDetails || !user?.organization_key) {
            message.error("Cannot save location. School details not found.");
            return;
        }

        dispatch(saveSchoolDetailsRequest({
            details: {
                ...schoolDetails,
                map_address: manualAddress
            }
        }));
    };

    if (loading) {
        return <Spin tip="Loading map..." />;
    }

    if (error) {
        return <Alert message="Error" description={error} type="error" showIcon />;
    }

    const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(displayAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

    return (
        <Card
            title="School Location"
            bordered={false}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
             <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col flex="auto">
                    <Input 
                        placeholder="Enter an address or coordinates to preview" 
                        value={manualAddress}
                        onChange={(e) => setManualAddress(e.target.value)}
                    />
                </Col>
                <Col>
                    <Button onClick={handleUpdateMap}>Update Map</Button>
                </Col>
                 <Col>
                    <Button type="primary" onClick={handleSaveLocation} disabled={!manualAddress || manualAddress === schoolDetails?.map_address}>
                        Save Location to Profile
                    </Button>
                </Col>
            </Row>

             {!displayAddress ? (
                <Empty
                    description={
                        <>
                            <Title level={5}>No Address Found</Title>
                            <Text>Please add your school's address in the "School Details" section to display the map.</Text>
                        </>
                    }
                />
            ) : (
                <div style={{ flexGrow: 1, height: '70vh' }}>
                     <iframe
                        src={mapSrc}
                        style={{ border: 0, width: '100%', height: '100%' }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                </div>
            )}
        </Card>
    );
};

export default MapView;
