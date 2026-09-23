import "../../assets/main.css";
import * as React from "react";
import { setTitle } from "../../utils/generalFunctions";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from '@mui/material/Button';
import { DataCard } from '../../components/Datacard/index';
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

const initialLogs = [
  { id: 1, date: '2026-05-18', houseId: 'H-001', issue: 'Lift motor noise', technician: 'Ramon', status: 'fixed' },
  { id: 2, date: '2026-05-19', houseId: 'H-002', issue: 'Lift motor noise', technician: 'Pedro', status: 'pending' },
  { id: 3, date: '2026-05-20', houseId: 'H-003', issue: 'Lift motor noise', technician: 'Anna', status: 'fixed' },
  { id: 4, date: '2026-05-20', houseId: 'H-004', issue: 'Lift motor noise', technician: 'Ramon', status: 'fixed' },
  { id: 5, date: '2026-05-21', houseId: 'H-005', issue: 'Lift motor noise', technician: 'Liza', status: 'pending' },
  { id: 6, date: '2026-05-21', houseId: 'H-006', issue: 'Lift motor noise', technician: 'Carlos', status: 'fixed' },
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const emptyForm = { date: todayStr(), houseId: '', issue: '', technician: '', status: 'pending' };

export const Maintenance = () => {
  setTitle('Maintenance');

  const [logs, setLogs] = React.useState(initialLogs);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [form, setForm] = React.useState(emptyForm);
  const [error, setError] = React.useState('');

  const totalReports = logs.length;
  const pending = logs.filter(l => l.status === 'pending').length;
  const fixedThisWeek = logs.filter(l => l.status === 'fixed').length;

  const openAddDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  };

  const openEditDialog = (log) => {
    setEditingId(log.id);
    setForm({ date: log.date, houseId: log.houseId, issue: log.issue, technician: log.technician, status: log.status });
    setError('');
    setDialogOpen(true);
  };

  const handleRemove = (log) => {
    if (!confirm(`Remove this report for ${log.houseId}?`)) return;
    setLogs((list) => list.filter((l) => l.id !== log.id));
  };

  const submitForm = () => {
    if (!form.houseId || !form.issue || !form.technician) {
      setError('House ID, issue and technician are required.');
      return;
    }

    if (editingId) {
      setLogs((list) => list.map((l) => (l.id === editingId ? { ...l, ...form } : l)));
    } else {
      setLogs((list) => [{ id: Date.now(), ...form }, ...list]);
    }
    setDialogOpen(false);
  };

  return (
    <>
      <h1 className="page-title">Maintenance</h1>
      <p className="page-subtitle">Track lift servicing and issue reports across all homes.</p>
      <div className="stacked-container" style={{ gap: '24px' }}>
        <div className="metrics-grid">
          <DataCard title="Total reports" value={totalReports} footer="All-time logs" variant="blue" />
          <DataCard title="Pending issues" value={pending} footer="Awaiting a technician" variant="amber" />
          <DataCard title="Fixed this week" value={fixedThisWeek} footer="Resolved in the last 7 days" variant="green" />
        </div>

        <div className="logs-wrapper">
          <Card className="logs-card" sx={{ backgroundColor: 'var(--hl-card-bg)', border: '1px solid var(--hl-border)', borderRadius: '14px', boxShadow: 'none' }}>
              <CardContent>
                <div className="logs-header">
                  <Typography variant="h6" sx={{ color: 'var(--hl-ink)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Maintenance logs</Typography>
                  <Button
                    onClick={openAddDialog}
                    sx={{
                      backgroundColor: 'var(--hl-accent)', color: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none', px: 2.5,
                      '&:hover': { backgroundColor: 'var(--hl-secondary-dark)' },
                    }}
                  >
                    + Add report
                  </Button>
                </div>

                <div className="table-responsive" style={{ marginTop: 12 }}>
                  <Table className="maintenance-table" sx={{ mt: 2, width: '100%' }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'var(--hl-page-bg)' }}>
                      <TableCell sx={{ color: 'var(--hl-ink-secondary)', fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ color: 'var(--hl-ink-secondary)', fontWeight: 600 }}>House ID</TableCell>
                      <TableCell sx={{ color: 'var(--hl-ink-secondary)', fontWeight: 600 }}>Issue</TableCell>
                      <TableCell sx={{ color: 'var(--hl-ink-secondary)', fontWeight: 600 }}>Technician</TableCell>
                      <TableCell sx={{ color: 'var(--hl-ink-secondary)', fontWeight: 600 }}>Status</TableCell>
                      <TableCell className="maintenance-table__action-col" sx={{ color: 'var(--hl-ink-secondary)', fontWeight: 600 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell sx={{ color: 'var(--hl-ink)', fontFamily: 'var(--font-mono)' }}>{r.date}</TableCell>
                        <TableCell sx={{ color: 'var(--hl-ink)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.houseId}</TableCell>
                        <TableCell sx={{ color: 'var(--hl-ink)' }}>{r.issue}</TableCell>
                        <TableCell sx={{ color: 'var(--hl-ink)' }}>{r.technician}</TableCell>
                        <TableCell>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: r.status === 'pending' ? 'var(--hl-warning-ink)' : 'var(--hl-success-ink)',
                            background: r.status === 'pending' ? 'var(--hl-warning-bg)' : 'var(--hl-success-bg)',
                          }}>{r.status}</span>
                        </TableCell>
                        <TableCell className="maintenance-table__action-col">
                          <div className="maintenance-table__actions">
                            <Button
                              className="maintenance-table__action-btn"
                              onClick={() => openEditDialog(r)}
                              sx={{ color: 'var(--hl-accent)', borderColor: 'var(--hl-accent)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' }}
                            >
                              Edit
                            </Button>
                            <Button
                              className="maintenance-table__action-btn"
                              onClick={() => handleRemove(r)}
                              sx={{ color: 'var(--hl-danger)', borderColor: 'var(--hl-danger)', border: '1px solid', backgroundColor: '#fff', fontWeight: 600, borderRadius: '9px', textTransform: 'none' }}
                            >
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ color: 'var(--hl-ink-tertiary)', textAlign: 'center', py: 4 }}>
                          No maintenance reports yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  </Table>
                </div>
              </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm" sx={{ '& .MuiPaper-root': { backgroundColor: 'var(--background-card)', color: 'var(--heading)' } }}>
        <DialogTitle sx={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{editingId ? 'Edit report' : 'Add report'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Date"
            type="date"
            fullWidth
            margin="normal"
            value={form.date}
            onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
            sx={{ '& .MuiInputBase-input': { color: 'var(--heading)' }, '& .MuiInputLabel-root': { color: 'var(--text)' }, '& .MuiOutlinedInput-root': { backgroundColor: 'var(--background)' } }}
          />
          <TextField
            label="House ID"
            fullWidth
            margin="normal"
            value={form.houseId}
            onChange={(e) => setForm((s) => ({ ...s, houseId: e.target.value }))}
            sx={{ '& .MuiInputBase-input': { color: 'var(--heading)' }, '& .MuiInputLabel-root': { color: 'var(--text)' }, '& .MuiOutlinedInput-root': { backgroundColor: 'var(--background)' } }}
          />
          <TextField
            label="Issue"
            fullWidth
            margin="normal"
            value={form.issue}
            onChange={(e) => setForm((s) => ({ ...s, issue: e.target.value }))}
            sx={{ '& .MuiInputBase-input': { color: 'var(--heading)' }, '& .MuiInputLabel-root': { color: 'var(--text)' }, '& .MuiOutlinedInput-root': { backgroundColor: 'var(--background)' } }}
          />
          <TextField
            label="Technician"
            fullWidth
            margin="normal"
            value={form.technician}
            onChange={(e) => setForm((s) => ({ ...s, technician: e.target.value }))}
            sx={{ '& .MuiInputBase-input': { color: 'var(--heading)' }, '& .MuiInputLabel-root': { color: 'var(--text)' }, '& .MuiOutlinedInput-root': { backgroundColor: 'var(--background)' } }}
          />
          <Select fullWidth value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))} sx={{ mt: 2, color: 'var(--heading)' }}>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="fixed">Fixed</MenuItem>
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
};

export default Maintenance;
