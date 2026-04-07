import React, { useState } from 'react';
import Layout from '../../Layout';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../contexts/ToastContext';

interface ActivityItem {
    _id: string;
    type: 'append_gaps' | 'sort' | 'upload_gaps' | 'edit_insurance' | 'contacts_vcf' | 'edit_config' | 'delete_config' | 'add_config' | 'other';
    description: string;
    timestamp: string;
    user?: string;
    status?: 'success' | 'error' | 'warning';
}

const Settings: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const toast = useToast();
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
    const [gapsFile, setGapsFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [filterType, setFilterType] = useState<string>('all');
    const [filterDate, setFilterDate] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const {data : gapsFileInfo} = useQuery ({
        queryKey: ['gapsFileInfo'],
        queryFn: async () => {

            try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                navigate('/login');
                throw new Error('No auth token');
            }
            
            const response = await fetch(`${API_BASE_URL}/api/gaps-file`, {
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                navigate('/login');
                return;
            }
            
            return response.json();
        } catch (error) {
            console.error("Error fetching gaps file info:", error);
        }
            
        }
        
    });

    const {data : history = []} = useQuery<ActivityItem[]> ({
        queryKey: ['history',  filterType, filterDate],
        queryFn: async () => {
            console.log('Fetching history with filters:', { filterType, filterDate });
        const response  = await fetch(`${API_BASE_URL}/api/history`, {
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'X-Filter-Type' : filterType,
                'X-Filter-Date' : filterDate
            }
        });
        if (!response.ok) {
                throw new Error('Failed to fetch history');
        }

        return response.json();

        }

    });


    const handleGapsFileUpload = async () => {
        if (!gapsFile) {
            toast.warning("Please select a file");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('gapsFile', gapsFile);

            const token = localStorage.getItem('authToken');
            if (!token) {
                navigate('/login');
                return;
            }
            
            const response = await fetch(`${API_BASE_URL}/api/gaps-file`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('authToken');
                navigate('/login');
                return;
            }

            if (response.ok) {
                toast.success("Gap Name Keys file uploaded successfully!");
                setGapsFile(null);
                queryClient.invalidateQueries({ queryKey : ['gapsFileInfo']});
            } else {
                const error = await response.json();
                toast.error(`Failed to upload: ${error.message}`);
            }
        } catch (error) {
            console.error("Error uploading gaps file:", error);
            toast.error("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    const getHistoryIcon = (type: ActivityItem['type']) => {
        switch (type) {
            case 'upload_gaps':
                // Upload/Cloud Arrow Up icon (Heroicons style)
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4" />
                    </svg>
                );
            case 'append_gaps':
                // Merge/join icon
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v10M8 17l-3-3m3 3l3-3M16 7v10M16 7l3 3m-3-3l-3 3" />
                    </svg>
                );
            case 'sort':
                // Sort icon
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
                    </svg>
                );
            case 'contacts_vcf':
                // Filled phone icon
                return (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22 16.92v2.08a2 2 0 01-2.18 2A19.86 19.86 0 013 5.18 2 2 0 015 3h2.09a2 2 0 012 1.72c.13.81.36 1.6.7 2.34a2 2 0 01-.45 2.11l-1.27 1.27a16 16 0 006.58 6.58l1.27-1.27a2 2 0 012.11-.45c.74.34 1.53.57 2.34.7a2 2 0 011.72 2z"/>
                    </svg>
                );
            case 'edit_config':
                // Gear/settings icon
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.89 3.31.877 2.42 2.42a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.89 1.543-.877 3.31-2.42 2.42a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.89-3.31-.877-2.42-2.42a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.89-1.543.877-3.31 2.42-2.42.997.575 2.254.117 2.573-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                );
            case 'delete_config':
                // Trash can icon
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5h6v2" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 11v6" />
                    </svg>
                );
            case 'add_config':
                // Plus icon
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12M6 12h12" />
                    </svg>
                );
            default:
                // Default document icon
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 11h10M7 15h6" />
                    </svg>
                );
        }
    };

    const handleExportCSV = () => {
        const headers = ['Type', 'Description', 'Timestamp', 'User', 'Status'];
        const rows = history.map((item) => [
            item.type,
            item.description,
            formatLocalTime(item.timestamp),
            item.user ?? '',
            item.status ?? ''
        ]);

        const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
        const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = `activity-history-${dateStr}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatLocalTime = (isoString: string) => {
        // Handles both ISO string and Date object
        const date = new Date(isoString);
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZoneName: 'short'
        });
    };

    return (
        <Layout>
            <style>{`
                .history-scrollbar::-webkit-scrollbar {
                    width: 30px;
                }
                .history-scrollbar::-webkit-scrollbar-track {
                    background: rgb(51 65 85 / 0.3);
                    border-radius: 20px;
                }
                .history-scrollbar::-webkit-scrollbar-thumb {
                    background: rgb(148 163 184);
                    border-radius: 20px;
                    border: 3px solid rgb(51 65 85 / 0.3);
                }
                .history-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgb(203 213 225);
                }
            `}</style>
            <div className="p-4 h-full flex flex-col">
                {/* Header Section */}
                <div className="mb-6">
                    <h1 className="text-white text-4xl font-bold mb-3">Settings</h1>
                    <p className="text-white/60 text-lg">Edit and create insurance mappings, adjust other configuration settings, and view recently completely tasks</p>
                </div>

                {/* Two Column Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4" style={{ height: '40%' }}>
                    <div className="cursor-pointer transition-colors duration-200 ease-in-out relative overflow-hidden bg-slate-700/60 border border-slate-600/50 hover:bg-slate-600/60 hover:border-slate-500/50 active:scale-[0.99] group rounded-xl shadow-lg flex items-center justify-center"
                    onClick={() => navigate('/settings/insurance-config')}>
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="text-center text-white p-10 z-10">
                            <h2 className="text-4xl font-extrabold mb-3 tracking-tight">Edit Insurance Configs</h2>
                            <p className="text-base opacity-90 leading-relaxed">Manage insurance configurations and settings</p>
                        </div>
                    </div>
                    <div className="transition-colors duration-200 ease-in-out relative overflow-hidden bg-slate-700/60 border border-slate-600/50 rounded-xl shadow-lg p-6 flex flex-col">
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
                            <div className={`w-full border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
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
                                        <div className="flex items-center justify-center gap-2">
                                            <p className="text-green-400 font-semibold">✓ {gapsFile.name}</p>
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setGapsFile(null); }}
                                                className="text-white/40 hover:text-red-400 transition-colors leading-none text-lg"
                                            >×</button>
                                        </div>
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
                            className="bg-indigo-600/70 hover:bg-indigo-500/70 border border-indigo-500/50 text-white font-semibold px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            {loading ? "Uploading..." : "Upload File"}
                        </button>
                    </div>
                </div>

                {/* History Section */}
                <div className="flex-1 bg-slate-700/60 border border-slate-600/50 rounded-xl shadow-lg p-6 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white text-2xl font-bold">Recent Activity</h3>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleExportCSV}
                                disabled={history.length === 0}
                                className="flex items-center gap-1.5 bg-slate-800/70 border border-slate-600/50 hover:bg-slate-700/70 hover:border-slate-500/50 text-white/80 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
                                title="Export current view as CSV"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                                </svg>
                                Export CSV
                            </button>
                            {/* Type Filter */}
                            <div className="flex items-center gap-2">
                                <label className="text-white/70 text-sm font-medium">Type:</label>
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="bg-slate-800/70 border border-slate-600/50 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                >
                                    <option value="all">All Types</option>
                                    <option value="append_gaps">Append Gaps</option>
                                    <option value="sort">Sort PDFs</option>
                                    <option value="upload_gaps">Upload Gaps</option>
                                    <option value="contacts_vcf">Generate VCF</option>
                                    <option value="edit_config">Edit Config</option>
                                    <option value="delete_config">Delete Config</option>
                                    <option value="add_config">Add Config</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            {/* Date Filter */}
                            <div className="flex items-center gap-2">
                                <label className="text-white/70 text-sm font-medium">Date:</label>
                                <select
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                    className="bg-slate-800/70 border border-slate-600/50 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                >
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="week">Last 7 Days</option>
                                    <option value="month">Last 30 Days</option>
                                    <option value="quarter">Last 3 Months</option>
                                    <option value="year">Last Year</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="mb-3 flex items-center gap-3">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search activity..."
                            className="flex-1 bg-slate-800/70 border border-slate-600/50 text-white text-sm rounded-lg px-3 py-1.5 placeholder-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                        />
                        {history.length > 0 && (
                            <span className="text-white/40 text-xs whitespace-nowrap">
                                {(() => {
                                    const count = history.filter(item => !searchQuery || item.description.toLowerCase().includes(searchQuery.toLowerCase())).length;
                                    return count === history.length ? `${history.length} results` : `${count} of ${history.length}`;
                                })()}
                            </span>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 history-scrollbar" style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgb(148 163 184) rgb(51 65 85 / 0.3)'
                    }}>
                        {(() => {
                            const filtered = history.filter(item =>
                                !searchQuery || item.description.toLowerCase().includes(searchQuery.toLowerCase())
                            );
                            return filtered.length === 0 ? (
                            <div className="text-white/50 text-center py-12">
                                <p>{history.length === 0 ? 'No recent activity to display' : 'No results match your search'}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filtered.map((item) => (
                                    <div
                                        key={item._id}
                                        className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4 hover:bg-slate-800/60 transition-colors duration-200"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center text-xl bg-slate-600/20 border-slate-500/50 text-slate-300">
                                                {getHistoryIcon(item.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-medium mb-1">{item.description}</p>
                                                <div className="flex items-center gap-3 text-sm text-white/60">
                                                    <span>{formatLocalTime(item.timestamp)}</span>
                                                    {item.user && (
                                                        <>
                                                            <span>•</span>
                                                            <span>by {item.user}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {item.status && (
                                                <div className="flex-shrink-0">
                                                    {item.status === 'success' && (
                                                        <span className="text-green-400 text-sm">✓</span>
                                                    )}
                                                    {item.status === 'error' && (
                                                        <span className="text-red-400 text-sm">✗</span>
                                                    )}
                                                    {item.status === 'warning' && (
                                                        <span className="text-yellow-400 text-sm">⚠</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                        })()}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default Settings;