import '../../../assets/main.css';
import { setTitle } from '../../../utils/generalFunctions';
import { Container } from '../../../components/Container/index';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import WaterGauge from '../../../components/WaterGauge/index';
import useServerSocket from '../../../hooks/useServerSocket';

const overview = [
    { label: 'System health', value: 'Nominal' },
    { label: 'Active houses', value: '12' },
    { label: 'Open alerts', value: '3' },
    { label: 'Pending maintenance', value: '5' },
];

export const AdminDashboard = () => {
    setTitle('Admin Dashboard');
    const { wlValue } = useServerSocket();

    return (
        <>
            <h1 className="page-title">Admin Dashboard</h1>
            <Container>
                <div className="home-layout">
                    <div className="home-main-column">
                        <div className="home-card-grid">
                            {overview.map((item) => (
                                <Card key={item.label} sx={{ backgroundColor: '#242629', border: 'none' }}>
                                    <CardContent>
                                        <Typography variant="subtitle2" sx={{ color: '#94a1b2' }}>{item.label}</Typography>
                                        <Typography variant="h5" sx={{ color: '#fffffe' }}>{item.value}</Typography>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    <div className="home-side-column">
                        <WaterGauge label="Water Level" min={0} max={4} value={wlValue ?? 0} unit="cm" />
                    </div>
                </div>
            </Container>
        </>
    );
};

export default AdminDashboard;