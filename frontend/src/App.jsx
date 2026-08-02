import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ScanAttendance from './pages/ScanAttendance';
import Exams from './pages/Exams';
import Students from './pages/Students';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Faculties from './pages/Faculties';
import Classes from './pages/Classes';
import Assignments from './pages/Assignments';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="scan" element={<ScanAttendance />} />
            <Route path="exams" element={<Exams />} />
            <Route
              path="students"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Students />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="faculties"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Faculties />
                </ProtectedRoute>
              }
            />
            <Route
              path="classes"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Classes />
                </ProtectedRoute>
              }
            />
            <Route
              path="assignments"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Assignments />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Reports />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
