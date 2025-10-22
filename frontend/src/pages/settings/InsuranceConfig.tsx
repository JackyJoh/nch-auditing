import React, { useState } from "react";
import Layout from "../../Layout";

interface ConfigField {
    label: string;
    value: string;
}

interface InsuranceConfigData {
    id: string;
    name: string;
    fields: Record<string, string>;
}

const InsuranceConfig: React.FC = () => {
    const fieldLabels = [
        "First Name", "Last Name", "Member ID", "Care Gap", "DOB",
        "Doctor/Provider", "Insurance", "Insurance Provided", "Full Name", "Notes"
    ];

    const [configName, setConfigName] = useState("");
    const [fieldMappings, setFieldMappings] = useState<Record<string, string>>(
        Object.fromEntries(fieldLabels.map(label => [label, ""]))
    );
    const [configs, setConfigs] = useState<InsuranceConfigData[]>([]);

    // Handle input changes for field mappings
    const handleFieldChange = (label: string, value: string) => {
        setFieldMappings(prev => ({ ...prev, [label]: value }));
    };

    // Add new configuration
    const handleAdd = () => {
        if (!configName.trim()) {
            alert("Please enter a configuration name");
            return;
        }
        const newConfig: InsuranceConfigData = {
            id: Date.now().toString(),
            name: configName,
            fields: { ...fieldMappings }
        };
        setConfigs(prev => [...prev, newConfig]);
        setConfigName("");
        setFieldMappings(Object.fromEntries(fieldLabels.map(label => [label, ""])));
    };

    // Delete configuration
    const handleDelete = (id: string) => {
        setConfigs(prev => prev.filter(config => config.id !== id));
    };

    // Edit configuration
    const handleEdit = (config: InsuranceConfigData) => {
        setConfigName(config.name);
        setFieldMappings(config.fields);
        handleDelete(config.id);
    };

    return (
        <Layout>
            <div className="p-4 h-full flex flex-col gap-4">
                {/* Header */}
                <div>
                    <h1 className="text-white text-4xl font-bold mb-2">Insurance Configuration</h1>
                    <p className="text-white/60 text-lg">Configure insurance mappings and column settings.</p>
                </div>

                {/* Add Configuration Form */}
                <div className="bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-lg p-6">
                    <h2 className="text-white text-2xl font-bold mb-4">Add New Configuration</h2>
                    
                    {/* Configuration Name */}
                    <div className="mb-4">
                        <label className="text-white/80 text-sm mb-2 block">Configuration Name (e.g., Ambetter, Cigna)</label>
                        <input
                            type="text"
                            value={configName}
                            onChange={(e) => setConfigName(e.target.value)}
                            className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-slate-500"
                            placeholder="Enter configuration name"
                        />
                    </div>

                    {/* Field Mappings - Horizontal Layout */}
                    <div className="mb-4">
                        <label className="text-white/80 text-sm mb-3 block">Column Mappings</label>
                        <div className="grid grid-cols-5 gap-3">
                            {fieldLabels.map((label) => (
                                <div key={label} className="flex flex-col">
                                    <span className="text-white/60 text-xs mb-1">{label}</span>
                                    <input
                                        type="text"
                                        value={fieldMappings[label]}
                                        onChange={(e) => handleFieldChange(label, e.target.value)}
                                        className="bg-slate-800/80 border border-slate-600/50 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-500"
                                        placeholder="Column name"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Add Button */}
                    <button
                        onClick={handleAdd}
                        className="bg-indigo-600/70 hover:bg-indigo-500/70 border border-indigo-500/50 text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200 shadow-lg"
                    >
                        Add Configuration
                    </button>
                </div>

                {/* Existing Configurations List */}
                <div className="flex-1 bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-lg p-6 overflow-hidden flex flex-col">
                    <h2 className="text-white text-2xl font-bold mb-4">Existing Configurations</h2>
                    <div className="flex-1 overflow-y-auto space-y-3">
                        {configs.length === 0 ? (
                            <div className="text-white/50 text-center py-12">
                                <p>No configurations added yet</p>
                            </div>
                        ) : (
                            configs.map((config) => (
                                <div
                                    key={config.id}
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
                                            className="bg-blue-600/70 hover:bg-blue-500/70 border border-blue-500/50 text-white px-4 py-2 rounded-lg transition-all duration-200 text-sm font-semibold"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(config.id)}
                                            className="bg-slate-700/80 hover:bg-red-600/70 border border-slate-500/50 hover:border-red-500/50 text-white px-4 py-2 rounded-lg transition-all duration-200 text-sm font-semibold"
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