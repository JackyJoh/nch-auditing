import React, { useState, useEffect } from "react";
import Layout from "../../Layout";
import { useNavigate } from "react-router-dom";

interface InsuranceConfigData {
    _id: string;
    name: string;
    fields: Record<string, string>;
    created_at?: string;
}

const InsuranceConfig: React.FC = () => {
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
    const navigate = useNavigate();
    
    const fieldLabels = [
        "First Name", "Last Name", "Member ID", "Care Gap", "DOB",
        "Doctor/Provider", "Insurance", "Insurance Provided", "Full Name", "Notes"
    ];

    const [configName, setConfigName] = useState("");
    const [fieldMappings, setFieldMappings] = useState<Record<string, string>>(
        Object.fromEntries(fieldLabels.map(label => [label, ""]))
    );
    const [configs, setConfigs] = useState<InsuranceConfigData[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Fetch configs on component mount
    useEffect(() => {
        fetchConfigs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch all configurations from backend
    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                navigate('/login');
                return;
            }
            
            const response = await fetch(`${API_BASE_URL}/api/insurance-configs`, {
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
                const data = await response.json();
                setConfigs(data);
            } else {
                alert("Failed to fetch configurations");
            }
        } catch (error) {
            console.error("Error fetching configs:", error);
            alert("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    // Handle input changes for field mappings
    const handleFieldChange = (label: string, value: string) => {
        setFieldMappings(prev => ({ ...prev, [label]: value }));
    };

    // Add or Update configuration
    const handleAdd = async () => {
        if (!configName.trim()) {
            alert("Please enter a configuration name");
            return;
        }

        const configData = {
            name: configName,
            fields: { ...fieldMappings }
        };

        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                navigate('/login');
                return;
            }
            
            let response;
            
            if (editingId) {
                // Update existing config
                response = await fetch(`${API_BASE_URL}/api/insurance-configs/${editingId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(configData),
                    credentials: 'include'
                });
            } else {
                // Create new config
                response = await fetch(`${API_BASE_URL}/api/insurance-configs`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(configData),
                    credentials: 'include'
                });
            }

            if (response.status === 401) {
                localStorage.removeItem('authToken');
                navigate('/login');
                return;
            }

            if (response.ok) {
                await fetchConfigs(); // Refresh the list
                setConfigName("");
                setFieldMappings(Object.fromEntries(fieldLabels.map(label => [label, ""])));
                setEditingId(null);
            } else {
                const error = await response.json();
                alert(`Failed to ${editingId ? 'update' : 'add'} configuration: ${error.message}`);
            }
        } catch (error) {
            console.error("Error saving config:", error);
            alert("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    // Delete configuration
    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this configuration?")) {
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                navigate('/login');
                return;
            }
            
            const response = await fetch(`${API_BASE_URL}/api/insurance-configs/${id}`, {
                method: 'DELETE',
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
                await fetchConfigs(); // Refresh the list
            } else {
                const error = await response.json();
                alert(`Failed to delete configuration: ${error.message}`);
            }
        } catch (error) {
            console.error("Error deleting config:", error);
            alert("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    // Edit configuration
    const handleEdit = (config: InsuranceConfigData) => {
        setConfigName(config.name);
        setFieldMappings(config.fields);
        setEditingId(config._id);
        // Scroll to top to see the form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Cancel editing
    const handleCancel = () => {
        setConfigName("");
        setFieldMappings(Object.fromEntries(fieldLabels.map(label => [label, ""])));
        setEditingId(null);
    };

    return (
        <Layout>
            <div className="p-4 h-full flex flex-col gap-3">
                {/* Header */}
                <div className="mb-2">
                    <h1 className="text-white text-3xl font-bold mb-1">Insurance Configuration</h1>
                    <p className="text-white/60 text-sm">Configure insurance mappings and column settings.</p>
                </div>

                {/* Add Configuration Form */}
                <div className="bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-lg p-4">
                    <h2 className="text-white text-xl font-bold mb-3">
                        {editingId ? "Edit Configuration" : "Add New Configuration"}
                    </h2>
                    
                    {/* Configuration Name */}
                    <div className="mb-3">
                        <label className="text-white/80 text-xs mb-1 block">Configuration Name (e.g., Ambetter, Cigna)</label>
                        <input
                            type="text"
                            value={configName}
                            onChange={(e) => setConfigName(e.target.value)}
                            className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-slate-500"
                            placeholder="Enter configuration name"
                        />
                    </div>

                    {/* Field Mappings - Horizontal Layout */}
                    <div className="mb-3">
                        <label className="text-white/80 text-xs mb-2 block">Column Mappings</label>
                        <div className="grid grid-cols-5 gap-2">
                            {fieldLabels.map((label) => (
                                <div key={label} className="flex flex-col">
                                    <span className="text-white/60 text-xs mb-1">{label}</span>
                                    <input
                                        type="text"
                                        value={fieldMappings[label]}
                                        onChange={(e) => handleFieldChange(label, e.target.value)}
                                        className="bg-slate-800/80 border border-slate-600/50 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-slate-500"
                                        placeholder="Column name"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Add/Update Button */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleAdd}
                            disabled={loading}
                            className="bg-indigo-600/70 hover:bg-indigo-500/70 border border-indigo-500/50 text-white font-semibold px-4 py-1.5 text-sm rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Processing..." : editingId ? "Update Configuration" : "Add Configuration"}
                        </button>
                        {editingId && (
                            <button
                                onClick={handleCancel}
                                disabled={loading}
                                className="bg-slate-600/70 hover:bg-slate-500/70 border border-slate-500/50 text-white font-semibold px-4 py-1.5 text-sm rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>

                {/* Existing Configurations List */}
                <div className="flex-1 bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-lg p-4 overflow-hidden flex flex-col">
                    <h2 className="text-white text-xl font-bold mb-3">Existing Configurations</h2>
                    <div className="flex-1 overflow-y-auto space-y-3">
                        {loading ? (
                            <div className="text-white/50 text-center py-12">
                                <p>Loading...</p>
                            </div>
                        ) : configs.length === 0 ? (
                            <div className="text-white/50 text-center py-12">
                                <p>No configurations added yet</p>
                            </div>
                        ) : (
                            configs.map((config) => (
                                <div
                                    key={config._id}
                                    className="bg-slate-800/60 border border-slate-600/50 rounded-lg p-4 flex items-center justify-between hover:bg-slate-800/80 transition-all duration-200"
                                >
                                    <div className="flex-1">
                                        <h3 className="text-white font-semibold text-lg mb-2">{config.name}</h3>
                                        <div className="grid grid-cols-5 gap-2 text-sm">
                                            {Object.entries(config.fields).map(([label, value]) => (
                                                <div key={label} className="text-white/60">
                                                    <span className="font-medium">{label}:</span> {value || "N/A"}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <button
                                            onClick={() => handleEdit(config)}
                                            disabled={loading}
                                            className="bg-blue-600/70 hover:bg-blue-500/70 border border-blue-500/50 text-white px-4 py-2 rounded-lg transition-all duration-200 text-sm font-semibold disabled:opacity-50"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(config._id)}
                                            disabled={loading}
                                            className="bg-slate-700/80 hover:bg-red-600/70 border border-slate-500/50 hover:border-red-500/50 text-white px-4 py-2 rounded-lg transition-all duration-200 text-sm font-semibold disabled:opacity-50"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default InsuranceConfig;