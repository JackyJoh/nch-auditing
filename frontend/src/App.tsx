import React from 'react';
import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Sorting from './pages/Sorting';
import Appending from './pages/Appending';
import Settings from './pages/settings/Settings';
import InsuranceConfig from './pages/settings/InsuranceConfig';
import Login from './pages/login';
import Contacts from './pages/Contacts';


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1
    },
  },

});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/sorting" element={<ProtectedRoute><Sorting /></ProtectedRoute>} />
          <Route path="/appending" element={<ProtectedRoute><Appending /></ProtectedRoute>} />
          <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/settings/insurance-config" element={<ProtectedRoute><InsuranceConfig /></ProtectedRoute>} />
          
          {/* Redirect unknown routes to home (which will redirect to login if not authenticated) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;