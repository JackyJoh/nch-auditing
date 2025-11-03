import React from 'react';
import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Sorting from './pages/Sorting';
import Appending from './pages/Appending';
import Settings from './pages/settings/Settings';
import InsuranceConfig from './pages/settings/InsuranceConfig';
import Login from './pages/login';


const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/sorting" element={<ProtectedRoute><Sorting /></ProtectedRoute>} />
        <Route path="/appending" element={<ProtectedRoute><Appending /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/settings/insurance-config" element={<ProtectedRoute><InsuranceConfig /></ProtectedRoute>} />
        
        {/* Redirect unknown routes to home (which will redirect to login if not authenticated) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;