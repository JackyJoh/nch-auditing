import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import './index.css';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="p-4 flex items-center justify-center h-full">
        <div className="grid grid-cols-2 gap-4 h-full w-full">
          <div className="flex flex-col gap-4">
            <div 
              className="flex-1 flex items-center justify-center cursor-pointer transition-all duration-200 ease-in-out relative overflow-hidden bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 hover:bg-slate-600/60 hover:border-slate-500/50 active:scale-[0.99] group rounded-xl shadow-lg"
              onClick={() => navigate('/appending')}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="text-center text-white p-10 z-10">
                <h2 className="text-5xl font-extrabold mb-5 tracking-tight">Update Master Gap Sheet</h2>
                <p className="text-lg opacity-90 max-w-md leading-relaxed">Manage and update your master audit sheet with the latest data.</p>
              </div>
            </div>
            <div 
              className="flex-1 flex items-center justify-center cursor-pointer transition-all duration-200 ease-in-out relative overflow-hidden bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 hover:bg-slate-600/60 hover:border-slate-500/50 active:scale-[0.99] group rounded-xl shadow-lg"
              onClick={() => navigate('/sorting')}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="text-center text-white p-10 z-10">
                <h2 className="text-5xl font-extrabold mb-5 tracking-tight">Sort PDFs</h2>
                <p className="text-lg opacity-90 max-w-md leading-relaxed">Organize and categorize PDF documents efficiently.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <div 
              className="flex-1 flex items-center justify-center cursor-pointer transition-all duration-200 ease-in-out relative overflow-hidden bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 hover:bg-slate-600/60 hover:border-slate-500/50 active:scale-[0.99] group rounded-xl shadow-lg"
              onClick={() => navigate('/settings')}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="text-center text-white p-10 z-10">
                <h2 className="text-5xl font-extrabold mb-5 tracking-tight">Settings</h2>
                <p className="text-lg opacity-90 max-w-md leading-relaxed">Configure your application preferences and options.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;