import { setTitle, triggerNotification } from '../../utils/generalFunctions';
import { DataCard } from '../../components/Datacard/index'
import { Container } from '../../components/Container/index';
import useNotifications from '../../hooks/useNotifications';
import WaterGauge from '../../components/WaterGauge/index'
import useServerSocket from '../../hooks/useServerSocket'

export const Home = () => {
    setTitle("Dashboard");
    const { newNotification } = useNotifications();

    const handleNewNotification = async () => {
        await triggerNotification({
            notifier: newNotification,
            title: 'Manual notification',
            description: 'Triggered from Home page button.',
            onError: (err) => console.error(err),
        });
    };
    const { wlValue } = useServerSocket();

        return (
                <>
                <h1 className="page-title">Dashboard</h1>

                <Container>
                    <div className="home-layout">
                        <div className="home-main-column">
                            <div className="home-card-grid">
                                <DataCard title="Temperature" value={38} unit="°C" footer="Above average by +4°" />
                                <DataCard title="House Status" value={"Normal"} footer={"All systems nominal"} variant="green" />
                                <DataCard title="Flood Risk" value={"Medium"} footer={"Monitor water levels"} variant="amber" />
                                <DataCard title="Lift State" value={"Lifted"} footer={"Manual override active"} variant="purple" />
                            </div>
                        </div>

                        <div className="home-side-column">
                            <WaterGauge label="Water Level" min={0} max={4} value={wlValue ?? 0} unit="cm" />
                        </div>
                    </div>
                </Container>
                </>
        );
}



