import React, { useState, useEffect } from 'react';
import Layout from '../Layout';

interface InsuranceConfig {
    _id: string;
    name: string;
    fields: Record<string, string>;
}

interface FileUpload {
    configId: string;
    configName: string;
    file: File | null;
}

const Appending: React.FC = () => {
    const API_BASE_URL = "http://localhost:5000";
    
    const [configs, setConfigs] = useState<InsuranceConfig[]>([]);
    const [selectedConfigs, setSelectedConfigs] = useState<string[]>([]);
    const [fileUploads, setFileUploads] = useState<FileUpload[]>([]);
    const [masterFile, setMasterFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    // Fetch insurance configs on mount
    useEffect(() => {
        fetchConfigs();
    }, []);

    // Update file uploads when selected configs change
    useEffect(() => {
        const newUploads = selectedConfigs.map(configId => {
            const existingUpload = fileUploads.find(u => u.configId === configId);
            const config = configs.find(c => c._id === configId);
            return existingUpload || {
                configId,
                configName: config?.name || '',
                file: null
            };
        });
        setFileUploads(newUploads);
    }, [selectedConfigs, configs]);

    const fetchConfigs = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/insurance-configs`);
            if (response.ok) {
                const data = await response.json();
                setConfigs(data);
            }
        } catch (error) {
            console.error("Error fetching configs:", error);
        }
    };

    const toggleConfigSelection = (configId: string) => {
        setSelectedConfigs(prev => 
            prev.includes(configId) 
                ? prev.filter(id => id !== configId)
                : [...prev, configId]
        );
    };

    const handleFileChange = (configId: string, file: File | null) => {
        setFileUploads(prev => 
            prev.map(upload => 
                upload.configId === configId 
                    ? { ...upload, file }
                    : upload
            )
        );
    };

    const handleAppend = () => {
        // TODO: Implement appending logic
        console.log("Master File:", masterFile);
        console.log("File Uploads:", fileUploads);
        alert("Appending functionality coming soon!");
    };

    return (
        <Layout>
            <div className="p-4 h-full flex flex-col gap-3">

                {/* Master File Upload - Priority Section */}
                <div className="bg-slate-700/60 backdrop-blur-sm border-2 border-indigo-500/50 rounded-xl shadow-lg p-4">
                    <h2 className="text-white text-lg font-bold mb-2">Master File (Required)</h2>
                    <p className="text-white/70 text-xs mb-3">Upload the master gap sheet that all care gap sheets will be appended to.</p>
                    
                    <div className="flex items-center gap-4">
                        <label className="flex-1 cursor-pointer">
                            <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200 ${
                                masterFile 
                                    ? 'border-green-500/50 bg-green-500/10' 
                                    : 'border-slate-500/50 bg-slate-800/50 hover:border-indigo-500/50 hover:bg-slate-700/50'
                            }`}>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={(e) => setMasterFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                />
                                {masterFile ? (
                                    <div>
                                        <p className="text-green-400 font-semibold text-sm">✓ {masterFile.name}</p>
                                        <p className="text-white/60 text-xs mt-1">Click to change file</p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-white/80 font-semibold text-sm">Click to upload master file</p>
                                        <p className="text-white/60 text-xs mt-1">Excel files only (.xlsx, .xls)</p>
                                    </div>
                                )}
                            </div>
                        </label>
                    </div>
                </div>

                {/* Insurance Config Selection */}
                <div className="bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-lg p-4">
                    <h2 className="text-white text-lg font-bold mb-2">Select Insurance Configurations</h2>
                    <p className="text-white/70 text-xs mb-3">Choose which insurance configurations you want to process.</p>
                    
                    {configs.length === 0 ? (
                        <div className="text-white/50 text-center py-6">
                            <p className="text-sm">No insurance configurations found.</p>
                            <p className="text-xs mt-1">Create configurations in Settings first.</p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {configs.map(config => (
                                <button
                                    key={config._id}
                                    onClick={() => toggleConfigSelection(config._id)}
                                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                                        selectedConfigs.includes(config._id)
                                            ? 'bg-indigo-600/80 border-2 border-indigo-400 text-white shadow-lg scale-105'
                                            : 'bg-slate-600/60 border border-slate-500/50 text-white/80 hover:bg-slate-500/60'
                                    }`}
                                >
                                    {config.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* File Upload Sections for Selected Configs */}
                <div className="flex-1 bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-lg p-4 overflow-hidden flex flex-col">
                    <h2 className="text-white text-lg font-bold mb-2">Upload Care Gap Sheets</h2>
                    <p className="text-white/70 text-xs mb-3">Upload the care gap sheet for each selected configuration.</p>
                    
                    <div className="flex-1 overflow-auto">
                        {fileUploads.length === 0 ? (
                            <div className="text-white/50 text-center py-12 h-full flex items-center justify-center">
                                <div>
                                    <p className="text-sm">No insurances selected</p>
                                    <p className="text-xs mt-1">Select configurations above to upload files</p>
                                </div>
                            </div>
                        ) : (
                            <div className={`grid gap-3 ${fileUploads.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {fileUploads.map(upload => (
                                    <div key={upload.configId} className="bg-slate-800/60 border border-slate-600/50 rounded-lg p-3">
                                        <h3 className="text-white font-semibold text-base mb-2">{upload.configName}</h3>
                                        
                                        <label className="cursor-pointer block">
                                            <div className={`border-2 border-dashed rounded-lg p-3 text-center transition-all duration-200 ${
                                                upload.file 
                                                    ? 'border-green-500/50 bg-green-500/10' 
                                                    : 'border-slate-500/50 bg-slate-700/50 hover:border-indigo-500/50'
                                            }`}>
                                                <input
                                                    type="file"
                                                    accept=".xlsx,.xls"
                                                    onChange={(e) => handleFileChange(upload.configId, e.target.files?.[0] || null)}
                                                    className="hidden"
                                                />
                                                {upload.file ? (
                                                    <div>
                                                        <p className="text-green-400 font-semibold text-sm">✓ {upload.file.name}</p>
                                                        <p className="text-white/60 text-xs mt-1">Click to change file</p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <p className="text-white/80 text-sm">Click to upload file</p>
                                                        <p className="text-white/60 text-xs mt-1">Excel files only (.xlsx, .xls)</p>
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Append Button */}
                <div className="bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-lg p-4">
                    <button
                        onClick={handleAppend}
                        disabled={!masterFile || fileUploads.length === 0 || fileUploads.some(u => !u.file) || loading}
                        className="w-full bg-indigo-600/70 hover:bg-indigo-500/70 border border-indigo-500/50 text-white font-bold text-base px-6 py-3 rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Processing..." : "Append to Master Sheet"}
                    </button>
                    {(!masterFile || fileUploads.some(u => !u.file)) && (
                        <p className="text-white/60 text-xs text-center mt-2">
                            {!masterFile ? "Please upload a master file" : "Please upload all care gap sheets"}
                        </p>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Appending;