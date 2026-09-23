import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { RequireAuth, RequireNotAuth } from "./components/RequireAuth";
import PersistLogin from "./components/PersistLogin";
import useAuth from "./hooks/auth/useAuth";
import { hasAnyRole } from "./utils/roles";

import Layout from "./components/Layout";
import { Home } from "./pages/Home/index";
import { History } from "./pages/History/index";
import { Settings } from "./pages/Settings/index";
import { Profile } from "./pages/Profile/index";

import { Error } from "./pages/Error/index";
import { HouseMonitoring } from "./pages/Safety/index";
import { Notifications } from "./pages/Notifications/index";
import { Maintenance } from "./pages/Maintenance/index";
import { Register } from "./pages/LoginSystem/register";
import { Login } from "./pages/LoginSystem/login";
import { AdminDashboard } from "./pages/Admin/Dashboard/index";
import { UserManagement } from "./pages/Admin/UserManagement/index";

const RootRedirect = () => {
    const { auth } = useAuth();
    const isAdmin = hasAnyRole(auth, ["admin"]);

    return <Navigate to={isAdmin ? "/admin/dashboard" : "/dashboard"} replace />;
};

function App() {
    return (
        <Router>

            <Routes> 

                <Route element={<PersistLogin />}>
                    <Route path="/" element={<RootRedirect />} />

                    {/* Routes requiring the user to be logged out */}
                    <Route element={<RequireNotAuth />}>
                        <Route path="/register" element={<Register/>} />
                        <Route path="/login" element={<Login/>} />
                    </Route>

                    {/* Routes that show the sidebar/layout (most of the app) */}
                    <Route element={<Layout />}> 
                        {/* Routes requiring the user to be logged in */}
                        <Route element={<RequireAuth allowedRoles={['user', 'app', 'admin']} />}>
                            <Route path="/home" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<Home />} />
                            <Route path="/history" element={<History />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/notifications" element={<Notifications />} />
                        </Route>

                        {/* Routes requiring the user to be an admin */}
                        <Route element={<RequireAuth allowedRoles={['admin']} />}>
                            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                            <Route path="/admin/dashboard" element={<AdminDashboard />} />
                            <Route path="/admin/house-monitoring" element={<HouseMonitoring />} />
                            <Route path="/admin/maintenance" element={<Maintenance />} />
                            <Route path="/admin/users" element={<UserManagement />} />
                        </Route>

                        <Route path="*" element={<Error code="404"/>} />
                    </Route>
                </Route>
            </Routes>
        </Router>
    );
}

export default App;