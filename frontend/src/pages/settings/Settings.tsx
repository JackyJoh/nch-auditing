import React, { useState, useEffect } from 'react';
import Layout from '../../Layout';
import { useNavigate } from 'react-router-dom';

const Settings: React.FC = () => {
    const navigate = useNavigate();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    const [gapsFile, setGapsFile] = useState<File | null>(null);
    const [gapsFileInfo, setGapsFileInfo] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchGapsFileInfo();
    }, []);

    const fetchGapsFileInfo = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/gaps-file`);
            if (response.ok) {
                const data = await response.json();
                setGapsFileInfo(data);
            }
        } catch (error) {
            console.error("Error fetching gaps file info:", error);
        }
    };

    const handleGapsFileUpload = async () => {
        if (!gapsFile) {
            alert("Please select a file");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('gapsFile', gapsFile);

            const response = await fetch(`${API_BASE_URL}/api/gaps-file`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                alert("Gap Name Keys file uploaded successfully!");
                setGapsFile(null);
                fetchGapsFileInfo();
            } else {
                const error = await response.json();
                alert(`Failed to upload: ${error.message}`);
            }
        } catch (error) {
            console.error("Error uploading gaps file:", error);
            alert("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

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
                    <div className="transition-all duration-200 ease-in-out relative overflow-hidden bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-lg p-6 flex flex-col">
                        <div className="text-center mb-4">
                            <h2 className="text-4xl font-extrabold mb-3 tracking-tight text-white">Gap Name Keys</h2>
                            <p className="text-base opacity-90 leading-relaxed text-white/90">Upload the care gap name key file</p>
                        </div>
                        
                        {gapsFileInfo?.exists && (
                            <div className="mb-3 p-2 bg-green-500/10 border border-green-500/50 rounded text-green-400 text-sm text-center">
                                ✓ File uploaded ({gapsFileInfo.row_count} rows)
                            </div>
                        )}
                        
                        <label className="cursor-pointer flex-1 flex items-center justify-center mb-3">
                            <div className={`w-full border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                                gapsFile 
                                    ? 'border-green-500/50 bg-green-500/10' 
                                    : 'border-slate-500/50 bg-slate-800/50 hover:border-indigo-500/50'
                            }`}>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={(e) => setGapsFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                />
                                {gapsFile ? (
                                    <div>
                                        <p className="text-green-400 font-semibold">✓ {gapsFile.name}</p>
                                        <p className="text-white/60 text-sm mt-1">Click to change</p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-white/80 font-semibold">Click to upload care gap name key file</p>
                                        <p className="text-white/60 text-sm mt-1">Excel or CSV files</p>
                                    </div>
                                )}
                            </div>
                        </label>
                        
                        <button
                            onClick={handleGapsFileUpload}
                            disabled={!gapsFile || loading}
                            className="bg-indigo-600/70 hover:bg-indigo-500/70 border border-indigo-500/50 text-white font-semibold px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            {loading ? "Uploading..." : "Upload File"}
                        </button>
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