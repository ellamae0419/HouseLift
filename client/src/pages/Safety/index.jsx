import '../../assets/main.css'
import * as React from 'react';
import { setTitle } from '../../utils/generalFunctions';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

const initialHouses = [
    { id: 'H-001', location: 'Backyard', waterLevel: 1.2, liftStatus: 'normal', mode: 'auto' },
    { id: 'H-002', location: 'Garage', waterLevel: 3.6, liftStatus: 'lifted', mode: 'manual' },
    { id: 'H-003', location: 'Front Yard', waterLevel: 0.4, liftStatus: 'normal', mode: 'auto' }
];

const emptyForm = { id: '', location: '', waterLevel: '', liftStatus: 'normal', mode: 'auto' };

export const HouseMonitoring = () => {
    setTitle("Flood Monitoring");

    const [houses, setHouses] = React.useState(initialHouses);
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [editingId, setEditingId] = React.useState(null);
    const [form, setForm] = React.useState(emptyForm);
    const [error, setError] = React.useState('');

    const openAddDialog = () => {
        setEditingId(null);
        setForm(emptyForm);
        setError('');
        setDialogOpen(true);
    };

    const openEditDialog = (house) => {
        setEditingId(house.id);
        setForm({ ...house, waterLevel: String(house.waterLevel) });
        setError('');
        setDialogOpen(true);
    };

    const handleRemove = (house) => {
        if (!confirm(`Remove ${house.id} (${house.location}) from monitoring?`)) return;
        setHouses((list) => list.filter((h) => h.id !== house.id));
    };

    const submitForm = () => {
        if (!form.id || !form.location || form.waterLevel === '') {
            setError('House ID, location and water level are required.');
            return;
        }
        const waterLevel = Number(form.waterLevel);
        if (Number.isNaN(waterLevel)) {
            setError('Water level must be a number.');
            return;
        }

        if (editingId) {
            setHouses((list) => list.map((h) => (h.id === editingId ? { ...form, waterLevel } : h)));
        } else {
            if (houses.some((h) => h.id === form.id)) {
                setError('A house with this ID already exists.');
                return;
            }
            setHouses((list) => [...list, { ...form, waterLevel }]);
        }
        setDialogOpen(false);
    };

    return (
        <>
            <h1 className='page-title'>Flood monitoring</h1>
            <p className="page-subtitle">Water levels and lift status for every registered home.</p>

            <Card sx={{ backgroundColor: 'var(--hl-card-bg)', border: '1px solid var(--hl-border)', borderRadius: '14px', boxShadow: 'none' }}>
                <CardContent>
                    <div className="settings-section-header">
                        <Typography variant="h6" sx={{ color: 'var(--hl-ink)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Monitored houses</Typography>
                        <Button
                            onClick={openAddDialog}
                            sx={{
                                backgroundColor: 'var(--hl-accent)', color: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none', px: 2.5,
                                '&:hover': { backgroundColor: 'var(--hl-secondary-dark)' },
                            }}
                        >
                            + Add house
                        </Button>
                    </div>

                    <div className="table-responsive" style={{ marginTop: 12 }}>
                        <Table className="house-monitoring-table">
                            <TableHead>
                                <TableRow sx={{ backgroundColor: 'var(--hl-page-bg)' }}>
                                    <TableCell sx={{ color: 'var(--hl-ink-secondary)', fontWeight: 600 }}>House ID</TableCell>
                                    <TableCell sx={{ color: 'var(--hl-ink-secondary)', fontWeight: 600 }}>Location</TableCell>
                                    <TableCell sx={{ color: 'var(--hl-ink-secondary)', fontWeight: 600 }}>Water level (cm)</TableCell>
                                    <TableCell sx={{ color: 'var(--hl-ink-secondary)', fontWeight: 600 }}>Lift status</TableCell>
                                    <TableCell sx={{ color: 'var(--hl-ink-secondary)', fontWeight: 600 }}>Mode</TableCell>
                                    <TableCell className="house-monitoring-table__action-col" sx={{ color: 'var(--hl-ink-secondary)', fontWeight: 600 }}>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {houses.map((h) => (
                                    <TableRow key={h.id}>
                                        <TableCell sx={{ color: 'var(--hl-ink)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{h.id}</TableCell>
                                        <TableCell sx={{ color: 'var(--hl-ink)' }}>{h.location}</TableCell>
                                        <TableCell sx={{ color: 'var(--hl-ink)', fontFamily: 'var(--font-mono)' }}>{h.waterLevel}</TableCell>
                                        <TableCell>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '999px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                color: h.liftStatus === 'lifted' ? 'var(--hl-warning-ink)' : 'var(--hl-success-ink)',
                                                background: h.liftStatus === 'lifted' ? 'var(--hl-warning-bg)' : 'var(--hl-success-bg)',
                                            }}>{h.liftStatus}</span>
                                        </TableCell>
                                        <TableCell sx={{ color: 'var(--hl-ink)' }}>{h.mode}</TableCell>
                                        <TableCell className="house-monitoring-table__action-col">
                                            <div className="house-monitoring-table__actions">
                                                <Button
                                                    className="house-monitoring-table__action-btn"
                                                    onClick={() => openEditDialog(h)}
                                                    sx={{ color: 'var(--hl-accent)', borderColor: 'var(--hl-accent)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' }}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    className="house-monitoring-table__action-btn"
                                                    onClick={() => handleRemove(h)}
                                                    sx={{ color: 'var(--hl-danger)', borderColor: 'var(--hl-danger)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' }}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {houses.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} sx={{ color: 'var(--hl-ink-tertiary)', textAlign: 'center', py: 4 }}>
                                            No houses being monitored yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm" sx={{ '& .MuiPaper-root': { backgroundColor: 'var(--background-card)', color: 'var(--heading)' } }}>
                <DialogTitle sx={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{editingId ? 'Edit house' : 'Add house'}</DialogTitle>
                <DialogContent>
                    <TextField
                        label="House ID"
                        fullWidth
                        margin="normal"
                        value={form.id}
                        disabled={!!editingId}
                        onChange={(e) => setForm((s) => ({ ...s, id: e.target.value }))}
                        sx={{ '& .MuiInputBase-input': { color: 'var(--heading)' }, '& .MuiInputLabel-root': { color: 'var(--text)' }, '& .MuiOutlinedInput-root': { backgroundColor: 'var(--background)' } }}
                    />
                    <TextField
                        label="Location"
                        fullWidth
                        margin="normal"
                        value={form.location}
                        onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))}
                        sx={{ '& .MuiInputBase-input': { color: 'var(--heading)' }, '& .MuiInputLabel-root': { color: 'var(--text)' }, '& .MuiOutlinedInput-root': { backgroundColor: 'var(--background)' } }}
                    />
                    <TextField
                        label="Water Level (cm)"
                        type="number"
                        fullWidth
                        margin="normal"
                        value={form.waterLevel}
                        onChange={(e) => setForm((s) => ({ ...s, waterLevel: e.target.value }))}
                        sx={{ '& .MuiInputBase-input': { color: 'var(--heading)' }, '& .MuiInputLabel-root': { color: 'var(--text)' }, '& .MuiOutlinedInput-root': { backgroundColor: 'var(--background)' } }}
                    />
                    <Select fullWidth value={form.liftStatus} onChange={(e) => setForm((s) => ({ ...s, liftStatus: e.target.value }))} sx={{ mt: 2, color: 'var(--heading)' }}>
                        <MenuItem value="normal">Normal</MenuItem>
                        <MenuItem value="lifted">Lifted</MenuItem>
                    </Select>
                    <Select fullWidth value={form.mode} onChange={(e) => setForm((s) => ({ ...s, mode: e.target.value }))} sx={{ mt: 2, color: 'var(--heading)' }}>
                        <MenuItem value="auto">Auto</MenuItem>
                        <MenuItem value="manual">Manual</MenuItem>
                    </Select>
                    {error && <Typography sx={{ color: 'var(--red)', mt: 1 }}>{error}</Typography>}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setDialogOpen(false)}
                        sx={{ color: 'var(--hl-accent)', borderColor: 'var(--hl-accent)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={submitForm}
                        sx={{ backgroundColor: 'var(--hl-accent)', color: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none', '&:hover': { backgroundColor: 'var(--hl-secondary-dark)' } }}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default HouseMonitoring;
