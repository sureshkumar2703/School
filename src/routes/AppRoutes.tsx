
import { useSelector } from 'react-redux';
import { Spin } from 'antd';
import { Switch, Route } from 'react-router-dom';
import { RootState } from '../store/store';
import AppLayout from '../components/layout/AppLayout';
import Login from '../pages/Login/Login';
import Register from '../pages/Login/Register';

const AppRoutes = () => {
    const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);

    if (loading) {
        return <Spin fullscreen tip="Initializing..." />;
    }

    if (isAuthenticated) {
        return <AppLayout />;
    }

    return (
        <Switch>
            <Route path="/register" component={Register} />
            <Route path="/" component={Login} />
        </Switch>
    );
};

export default AppRoutes;
