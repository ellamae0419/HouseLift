import "../../assets/main.css";
import * as React from "react";
import { setTitle } from "../../utils/generalFunctions";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

const sampleLogs = [
  { date: '2026-05-18', houseId: 'H-001', issue: 'Lift motor noise', technician: 'Ramon', status: 'fixed' },
  { date: '2026-05-19', houseId: 'H-002', issue: 'Lift motor noise', technician: 'Pedro', status: 'pending' },
  { date: '2026-05-20', houseId: 'H-003', issue: 'Lift motor noise', technician: 'Anna', status: 'fixed' },
  { date: '2026-05-20', houseId: 'H-004', issue: 'Lift motor noise', technician: 'Ramon', status: 'fixed' },
  { date: '2026-05-21', houseId: 'H-005', issue: 'Lift motor noise', technician: 'Liza', status: 'pending' },
  { date: '2026-05-21', houseId: 'H-006', issue: 'Lift motor noise', technician: 'Carlos', status: 'fixed' },
];

export const Maintenance = () => {
  setTitle('Maintenance');

  const totalReports = sampleLogs.length;
  const pending = sampleLogs.filter(l => l.status === 'pending').length;
  const fixedThisWeek = sampleLogs.filter(l => l.status === 'fixed').length;

  return (
    <>
      <h1 className="page-title">Maintenance</h1>
      <div className="stacked-container">
        <div className="metrics-grid">
          <Card className="metric-card" sx={{ backgroundColor: '#242629', padding: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: '#94a1b2' }}>Total reports</Typography>
              <Typography variant="h5" sx={{ color: '#fffffe' }}>{totalReports}</Typography>
            </CardContent>
          </Card>

          <Card className="metric-card" sx={{ backgroundColor: '#242629', padding: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: '#94a1b2' }}>Pending issues</Typography>
              <Typography variant="h5" sx={{ color: '#fffffe' }}>{pending}</Typography>
            </CardContent>
          </Card>

          <Card className="metric-card" sx={{ backgroundColor: '#242629', padding: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: '#94a1b2' }}>Fixed this week</Typography>
              <Typography variant="h5" sx={{ color: '#fffffe' }}>{fixedThisWeek}</Typography>
            </CardContent>
          </Card>
        </div>

        <div className="logs-wrapper">
          <Card className="logs-card" sx={{ backgroundColor: '#242629', border: 'none' }}>
              <CardContent>
                <div className="logs-header">
                  <Typography variant="h6" sx={{ color: '#fffffe', fontWeight: 700 }}>Maintenance Logs</Typography>
                  <Button variant="contained" color="primary">Add Report</Button>
                </div>

                <div className="table-responsive" style={{ marginTop: 12 }}>
                  <Table className="maintenance-table" sx={{ mt: 2, width: '100%' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: '#94a1b2' }}>Date</TableCell>
                      <TableCell sx={{ color: '#94a1b2' }}>House ID</TableCell>
                      <TableCell sx={{ color: '#94a1b2' }}>Issue</TableCell>
                      <TableCell sx={{ color: '#94a1b2' }}>Technician</TableCell>
                      <TableCell className="maintenance-table__action-col" sx={{ color: '#94a1b2' }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sampleLogs.map((r, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ color: '#fffffe' }}>{r.date}</TableCell>
                        <TableCell sx={{ color: '#fffffe' }}>{r.houseId}</TableCell>
                        <TableCell sx={{ color: '#fffffe' }}>{r.issue}</TableCell>
                        <TableCell sx={{ color: '#fffffe' }}>{r.technician}</TableCell>
                        <TableCell className="maintenance-table__action-col">
                          <div className="maintenance-table__actions">
                            <Button className="maintenance-table__action-btn" variant="outlined" color="primary">Edit</Button>
                            <Button className="maintenance-table__action-btn" variant="outlined" color="error">Remove</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </div>
              </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Maintenance;
