import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../Layout';
import '../index.css';

interface ActivityItem {
  _id: string;
  type: string;
  timestamp: string;
  status?: 'success' | 'error' | 'warning';
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');

  const { data: history = [] } = useQuery<ActivityItem[]>({
    queryKey: ['history', 'all', 'all'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/history`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'X-Filter-Type': 'all',
          'X-Filter-Date': 'all',
        },
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const lastRun = (type: string) => {
    const item = history.find(h => h.type === type && h.status === 'success');
    return item ? timeAgo(item.timestamp) : null;
  };

  return (
    <Layout>
      <div className="p-4 flex flex-col items-center justify-center h-full">
        <div className="grid grid-cols-2 grid-rows-2 gap-4 flex-1 w-full">
          {/* Top left */}
          <div 
            className="flex flex-col gap-4 flex-1 row-start-1 col-start-1"
          >
            <div 
              className="flex-1 flex items-center justify-center cursor-pointer transition duration-200 ease-in-out relative overflow-hidden bg-slate-700/60 border border-slate-600/50 hover:bg-slate-600/60 hover:border-slate-500/50 active:scale-[0.99] group rounded-xl shadow-lg"
              onClick={() => navigate('/appending')}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="text-center text-white p-10 z-10">
                <h2 className="text-5xl font-extrabold mb-5 tracking-tight">Update Master Gap Sheet</h2>
                <p className="text-lg opacity-90 max-w-md mx-auto leading-relaxed">Manage and update your master audit sheet with the latest data.</p>
                {lastRun('append_gaps') && (
                  <p className="text-sm text-white/40 mt-3">Last run: {lastRun('append_gaps')}</p>
                )}
              </div>
            </div>
          </div>
          {/* Top right */}
          <div 
            className="flex flex-col gap-4 flex-1 row-start-1 col-start-2"
          >
            <div 
              className="flex-1 flex items-center justify-center cursor-pointer transition duration-200 ease-in-out relative overflow-hidden bg-slate-700/60 border border-slate-600/50 hover:bg-slate-600/60 hover:border-slate-500/50 active:scale-[0.99] group rounded-xl shadow-lg"
              onClick={() => navigate('/contacts')}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="text-center text-white p-10 z-10">
                <h2 className="text-5xl font-extrabold mb-5 tracking-tight">Contacts</h2>
                <p className="text-lg opacity-90 max-w-md mx-auto leading-relaxed">View and manage your contacts for auditing.</p>
                {lastRun('contacts_vcf') && (
                  <p className="text-sm text-white/40 mt-3">Last run: {lastRun('contacts_vcf')}</p>
                )}
              </div>
            </div>
          </div>
          {/* Bottom left */}
          <div 
            className="flex flex-col gap-4 flex-1 row-start-2 col-start-1"
          >
            <div 
              className="flex-1 flex items-center justify-center cursor-pointer transition duration-200 ease-in-out relative overflow-hidden bg-slate-700/60 border border-slate-600/50 hover:bg-slate-600/60 hover:border-slate-500/50 active:scale-[0.99] group rounded-xl shadow-lg"
              onClick={() => navigate('/sorting')}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="text-center text-white p-10 z-10">
                <h2 className="text-5xl font-extrabold mb-5 tracking-tight">Sort PDFs</h2>
                <p className="text-lg opacity-90 max-w-md mx-auto leading-relaxed">Organize and categorize PDF documents efficiently.</p>
                {lastRun('sort') && (
                  <p className="text-sm text-white/40 mt-3">Last run: {lastRun('sort')}</p>
                )}
              </div>
            </div>
          </div>
          {/* Bottom right */}
          <div 
            className="flex flex-col gap-4 flex-1 row-start-2 col-start-2"
          >
            <div 
              className="flex-1 flex items-center justify-center cursor-pointer transition duration-200 ease-in-out relative overflow-hidden bg-slate-700/60 border border-slate-600/50 hover:bg-slate-600/60 hover:border-slate-500/50 active:scale-[0.99] group rounded-xl shadow-lg"
              onClick={() => navigate('/settings')}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="text-center text-white p-10 z-10">
                <h2 className="text-5xl font-extrabold mb-5 tracking-tight">Settings</h2>
                <p className="text-lg opacity-90 max-w-md mx-auto leading-relaxed">Configure your application preferences and options.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center text-white/60 text-sm py-4">
          © {new Date().getFullYear()} Naples Comprehensive Health. All rights reserved.
        </div>
      </div>
    </Layout>
  );
};

export default Home;