import React from 'react';
import Layout from '../../Layout';
import { useNavigate } from 'react-router-dom';

const Settings: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Layout>
            <div className="p-4 h-full flex flex-col">
                {/* Header Section */}
                <div className="mb-6">
                    <h1 className="text-white text-4xl font-bold mb-3">Settings</h1>
                    <p className="text-white/60 text-lg">Edit and create insurance mappings, adjust other configuration settings, and view recently completely tasks</p>
                </div>

                {/* Two Column Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4" style={{ height: '40%' }}>
                    <div className="cursor-pointer transition-all duration-200 ease-in-out relative overflow-hidden bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 hover:bg-slate-600/60 hover:border-slate-500/50 active:scale-[0.99] group rounded-xl shadow-lg flex items-center justify-center"
                    onClick={() => navigate('/settings/insurance-config')}>
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="text-center text-white p-10 z-10">
                            <h2 className="text-4xl font-extrabold mb-3 tracking-tight">Edit Insurance Configs</h2>
                            <p className="text-base opacity-90 leading-relaxed">Manage insurance configurations and settings</p>
                        </div>
                    </div>
                    <div className="cursor-pointer transition-all duration-200 ease-in-out relative overflow-hidden bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 hover:bg-slate-600/60 hover:border-slate-500/50 active:scale-[0.99] group rounded-xl shadow-lg flex items-center justify-center">
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="text-center text-white p-10 z-10">
                            <h2 className="text-4xl font-extrabold mb-3 tracking-tight">Other</h2>
                            <p className="text-base opacity-90 leading-relaxed">Additional settings and configurations</p>
                        </div>
                    </div>
                </div>

                {/* History Section */}
                <div className="flex-1 bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-lg p-6">
                    <h3 className="text-white text-2xl font-bold mb-4">Recent Activity</h3>
                    <div className="text-white/50 text-center py-12">
                        <p>No recent activity to display</p>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default Settings;