import '../../assets/main.css'
import { setTitle } from '../../utils/generalFunctions';

const sampleHouses = [
    { id: 'H-001', location: 'Backyard', waterLevel: 1.2, liftStatus: 'normal', mode: 'auto' },
    { id: 'H-002', location: 'Garage', waterLevel: 3.6, liftStatus: 'lifted', mode: 'manual' },
    { id: 'H-003', location: 'Front Yard', waterLevel: 0.4, liftStatus: 'normal', mode: 'auto' }
];

export const HouseMonitoring = () => {

    setTitle("House Monitoring");

    return (
        <>
            <h1 className='page-title'>House Monitoring</h1>

            <div className="container" style={{ background: 'var(--background-card)', padding: '1rem' }}>
                <div className="table-responsive">
                <table className="house-monitoring-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', color: 'var(--text)' }}>
                            <th>House ID</th>
                            <th>Location</th>
                            <th>Water Level (cm)</th>
                            <th>Lift Status</th>
                            <th>Mode</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sampleHouses.map((h) => (
                            <tr key={h.id} style={{ borderTop: '1px solid var(--lines)' }}>
                                <td style={{ padding: '12px 8px', color: 'var(--text)' }}>{h.id}</td>
                                <td style={{ padding: '12px 8px', color: 'var(--text)' }}>{h.location}</td>
                                <td style={{ padding: '12px 8px', color: 'var(--text)' }}>{h.waterLevel}</td>
                                <td style={{ padding: '12px 8px' }}>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '8px',
                                        background: h.liftStatus === 'lifted' ? 'var(--red)' : 'var(--green)',
                                        color: 'var(--button-text)'
                                    }}>{h.liftStatus}</span>
                                </td>
                                <td style={{ padding: '12px 8px', color: 'var(--text)' }}>{h.mode}</td>
                                <td className="house-monitoring-table__action-col" style={{ padding: '12px 8px' }}>
                                    <div className="house-monitoring-table__actions">
                                        <button className="button house-monitoring-table__action-btn" onClick={() => {}}>Edit</button>
                                        <button className="button house-monitoring-table__action-btn" onClick={() => {}}>Remove</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
        </>
    );
}



