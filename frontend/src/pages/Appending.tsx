import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../Layout';
import { FilePreviewButton, FileInfoBadge } from '../components/FilePreviewModal';
import { useToast } from '../contexts/ToastContext';

interface InsuranceConfig {
    _id: string;
    name: string;
    fields: Record<string, string>;
}

interface FileUpload {
    configId: string;
    configName: string;
    file: File | null;
    notesHeader: string;
}

const Appending: React.FC = () => {
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
    const toast = useToast();
    
    const [configs, setConfigs] = useState<InsuranceConfig[]>([]);
    const [selectedConfigs, setSelectedConfigs] = useState<string[]>([]);
    const [fileUploads, setFileUploads] = useState<FileUpload[]>([]);
    const [masterFile, setMasterFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [enableToBeRemoved, setEnableToBeRemoved] = useState(false);
    const [isDraggingMaster, setIsDraggingMaster] = useState(false);
    const [draggingConfigId, setDraggingConfigId] = useState<string | null>(null);

    const queryClient = useQueryClient();

    // Save file to localStorage as base64 string
    const saveFileToLocalStorage = async (key: string, file: File) => {
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                localStorage.setItem(key, reader.result as string);
                localStorage.setItem(`${key}_name`, file.name);
                resolve();
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Load file from localStorage
    const loadFileFromLocalStorage = (key: string): File | null => {
        const base64 = localStorage.getItem(key);
        const name = localStorage.getItem(`${key}_name`) || '';
        if (!base64) return null;
        try {
            const arr = base64.split(',');
            const mime = arr[0].match(/:(.*?);/)?.[1] || '';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new File([u8arr], name, { type: mime });
        } catch (error) {
            console.error('Error loading file from localStorage:', error);
            return null;
        }
    };

    // Load all config files from localStorage
    const loadConfigFilesFromLocalStorage = (): Record<string, File> => {
        const configFiles: Record<string, File> = {};
        // Get all keys from localStorage that match the pattern
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('appending_config_') && !key.endsWith('_name')) {
                const file = loadFileFromLocalStorage(key);
                if (file) {
                    const configId = key.replace('appending_config_', '');
                    configFiles[configId] = file;
                }
            }
        }
        return configFiles;
    };

    // React Query for loading master file
    const { data: savedMasterFile } = useQuery({
        queryKey: ['appendingMasterFile'],
        queryFn: () => loadFileFromLocalStorage('appending_master'),
    });

    // React Query for loading config files
    const { data: savedConfigFiles } = useQuery({
        queryKey: ['appendingConfigFiles'],
        queryFn: loadConfigFilesFromLocalStorage,
    });

    // Mutation for saving master file
    const saveMasterFileMutation = useMutation({
        mutationFn: (file: File) => saveFileToLocalStorage('appending_master', file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appendingMasterFile'] });
        },
    });

    // Mutation for saving config file
    const saveConfigFileMutation = useMutation({
        mutationFn: ({ configId, file }: { configId: string; file: File }) => 
            saveFileToLocalStorage(`appending_config_${configId}`, file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appendingConfigFiles'] });
        },
    });

    // On mount, load master file from localStorage if exists
    useEffect(() => {
        if (savedMasterFile) {
            setMasterFile(savedMasterFile);
        }
    }, [savedMasterFile]);

    // Fetch insurance configs function
    const fetchConfigs = async (): Promise<InsuranceConfig[]> => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = '/login';
            throw new Error('No auth token');
        }
        const response = await fetch(`${API_BASE_URL}/api/insurance-configs`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (response.ok) {
            const data = await response.json();
            return data;
        } else if (response.status === 401) {
            localStorage.removeItem('authToken');
            window.location.href = '/login';
            throw new Error('Unauthorized');
        }
        throw new Error('Failed to fetch configs');
    };

    // React Query for fetching and caching insurance configs
    const { data: cachedConfigs } = useQuery({
        queryKey: ['insuranceConfigs'],
        queryFn: fetchConfigs,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    // Update configs state when cached data changes
    useEffect(() => {
        if (cachedConfigs) {
            setConfigs(cachedConfigs);
        }
    }, [cachedConfigs]);

    // Load selected configs from localStorage
    const loadSelectedConfigs = (): string[] => {
        const saved = localStorage.getItem('appending_selectedConfigs');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.error('Error parsing saved selected configs:', error);
            }
        }
        return [];
    };

    // React Query for loading selected configs
    const { data: savedSelectedConfigs } = useQuery({
        queryKey: ['appendingSelectedConfigs'],
        queryFn: loadSelectedConfigs,
    });

    // Mutation for saving selected configs
    const saveSelectedConfigsMutation = useMutation({
        mutationFn: async (selectedIds: string[]) => {
            localStorage.setItem('appending_selectedConfigs', JSON.stringify(selectedIds));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appendingSelectedConfigs'] });
        },
    });

    // Restore selected configs on mount
    useEffect(() => {
        if (savedSelectedConfigs && savedSelectedConfigs.length > 0) {
            setSelectedConfigs(savedSelectedConfigs);
        }
    }, [savedSelectedConfigs]);

    // Load enableToBeRemoved from localStorage
    const loadEnableToBeRemoved = (): boolean => {
        const saved = localStorage.getItem('appending_enableToBeRemoved');
        return saved === 'true';
    };

    // React Query for loading enableToBeRemoved
    const { data: savedEnableToBeRemoved } = useQuery({
        queryKey: ['appendingEnableToBeRemoved'],
        queryFn: loadEnableToBeRemoved,
    });

    // Mutation for saving enableToBeRemoved
    const saveEnableToBeRemovedMutation = useMutation({
        mutationFn: async (enabled: boolean) => {
            localStorage.setItem('appending_enableToBeRemoved', enabled.toString());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appendingEnableToBeRemoved'] });
        },
    });

    // Restore enableToBeRemoved on mount
    useEffect(() => {
        if (savedEnableToBeRemoved !== undefined) {
            setEnableToBeRemoved(savedEnableToBeRemoved);
        }
    }, [savedEnableToBeRemoved]);

    // Update file uploads when selected configs change
    useEffect(() => {
        const newUploads = selectedConfigs.map(configId => {
            const existingUpload = fileUploads.find(u => u.configId === configId);
            const config = configs.find(c => c._id === configId);
            // Check if there's a saved file for this config
            const savedFile = savedConfigFiles?.[configId] || null;
            return existingUpload || {
                configId,
                configName: config?.name || '',
                file: savedFile,
                notesHeader: ''
            };
        });
        setFileUploads(newUploads);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedConfigs, configs, savedConfigFiles]);

    const toggleConfigSelection = (configId: string) => {
        setSelectedConfigs(prev => {
            const newSelection = prev.includes(configId) 
                ? prev.filter(id => id !== configId)
                : [...prev, configId];
            // Save to cache
            saveSelectedConfigsMutation.mutate(newSelection);
            return newSelection;
        });
    };

    const handleFileChange = (configId: string, file: File | null) => {
        setFileUploads(prev => 
            prev.map(upload => 
                upload.configId === configId 
                    ? { ...upload, file }
                    : upload
            )
        );
        // Save to localStorage
        if (file) {
            saveConfigFileMutation.mutate({ configId, file });
        }
    };

    const handleNotesHeaderChange = (configId: string, notesHeader: string) => {
        setFileUploads(prev => 
            prev.map(upload => 
                upload.configId === configId 
                    ? { ...upload, notesHeader }
                    : upload
            )
        );
    };

    // Drag and drop handlers for master file
    const handleMasterDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingMaster(true);
    };

    const handleMasterDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set to false if we're actually leaving the drop zone (not entering a child element)
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        if (
            e.clientX <= rect.left ||
            e.clientX >= rect.right ||
            e.clientY <= rect.top ||
            e.clientY >= rect.bottom
        ) {
            setIsDraggingMaster(false);
        }
    };

    const handleMasterDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingMaster(true);
    };

    const handleMasterDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingMaster(false);
        
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            const fileName = file.name.toLowerCase();
            if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
                setMasterFile(file);
                saveMasterFileMutation.mutate(file);
            } else {
                toast.warning('Please upload only Excel (.xlsx, .xls) or CSV (.csv) files');
            }
        }
    };

    // Drag and drop handlers for config files
    const handleConfigDragEnter = (configId: string) => (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDraggingConfigId(configId);
    };

    const handleConfigDragLeave = (configId: string) => (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        if (
            e.clientX <= rect.left ||
            e.clientX >= rect.right ||
            e.clientY <= rect.top ||
            e.clientY >= rect.bottom
        ) {
            setDraggingConfigId(null);
        }
    };

    const handleConfigDragOver = (configId: string) => (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDraggingConfigId(configId);
    };

    const handleConfigDrop = (configId: string) => (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDraggingConfigId(null);
        
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            const fileName = file.name.toLowerCase();
            if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
                handleFileChange(configId, file);
                saveConfigFileMutation.mutate({ configId, file });
            } else {
                toast.warning('Please upload only Excel (.xlsx, .xls) or CSV (.csv) files');
            }
        }
    };

    const handleAppend = async () => {
        if (!masterFile || fileUploads.length === 0 || fileUploads.some(u => !u.file)) {
            toast.warning("Please upload all required files");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                window.location.href = '/login';
                return;
            }
            // Create FormData to send files
            const formData = new FormData();
            
            // Add master file
            formData.append('masterFile', masterFile);

            formData.append('enableToBeRemoved', enableToBeRemoved ? 'true' : 'false');
            
            // Add care gap sheets with their config IDs and optional notes headers
            fileUploads.forEach((upload, index) => {
                if (upload.file) {
                    formData.append(`careSheet_${index}`, upload.file);
                    formData.append(`configId_${index}`, upload.configId);
                    // Send notesHeader if it's not empty (to override MongoDB value)
                    if (upload.notesHeader.trim()) {
                        formData.append(`notesHeader_${index}`, upload.notesHeader);
                    }
                }
            });
            
            // Send to backend
            const response = await fetch(`${API_BASE_URL}/api/append-care-gaps`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (response.ok) {
                // Get the file blob
                const blob = await response.blob();
                
                // Create download link
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'merged_care_gaps.xlsx';
                document.body.appendChild(a);
                a.click();
                
                // Cleanup
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                toast.success("Files merged successfully! Check your downloads.");
            } else if (response.status === 401) {
                localStorage.removeItem('authToken');
                window.location.href = '/login';
            } else {
                const error = await response.json();
                toast.error(`Failed to merge files: ${error.message}`);
            }
        } catch (error) {
            console.error("Error merging files:", error);
            toast.error("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="p-4 h-full flex flex-col gap-3">

                {/* Master File Upload - Priority Section */}
                <div 
                    className="bg-slate-700/60 backdrop-blur-sm border-2 border-indigo-500/50 rounded-xl shadow-lg p-4"
                    onDragEnter={handleMasterDragEnter}
                    onDragLeave={handleMasterDragLeave}
                    onDragOver={handleMasterDragOver}
                    onDrop={handleMasterDrop}
                >
                    <h2 className="text-white text-lg font-bold mb-2">Master File (Required)</h2>
                    <p className="text-white/70 text-xs mb-3">Upload the master care gap sheet that all care gap sheets will be appended to.</p>
                    
                    <div className="flex items-center gap-4">
                        <label className="flex-1 cursor-pointer">
                            <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200 ${
                                isDraggingMaster
                                    ? 'border-indigo-400 bg-indigo-500/20'
                                    : masterFile 
                                        ? 'border-green-500/50 bg-green-500/10' 
                                        : 'border-slate-500/50 bg-slate-800/50 hover:border-indigo-500/50 hover:bg-slate-700/50'
                            }`}>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        setMasterFile(file);
                                        if (file) saveMasterFileMutation.mutate(file);
                                    }}
                                    className="hidden"
                                />
                                {masterFile ? (
                                    <div>
                                        <p className="text-green-400 font-semibold text-sm">✓ {masterFile.name}</p>
                                        <FileInfoBadge file={masterFile} />
                                        <p className="text-white/60 text-xs mt-1">Click or drag to change file</p>
                                        <FilePreviewButton file={masterFile} />
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-white/80 font-semibold text-sm">
                                            {isDraggingMaster ? 'Drop file here' : 'Drag & drop or click to upload'}
                                        </p>
                                        <p className="text-white/60 text-xs mt-1">Excel or CSV files (.xlsx, .xls, .csv)</p>
                                    </div>
                                )}
                            </div>
                        </label>
                    </div>

                    {/* Enable to be removed toggle */}
                    <div className="mt-4 pt-4 border-t border-slate-600/50">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={enableToBeRemoved}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setEnableToBeRemoved(checked);
                                        saveEnableToBeRemovedMutation.mutate(checked);
                                    }}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-600/60 rounded-full peer-checked:bg-indigo-600/80 transition-all duration-200 border border-slate-500/50 peer-checked:border-indigo-400/50"></div>
                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 peer-checked:translate-x-5"></div>
                            </div>
                            <div>
                                <p className="text-white font-semibold text-sm group-hover:text-indigo-300 transition-colors">Enable to be removed?</p>
                                <p className="text-white/60 text-xs">Process items marked for removal</p>
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
                                    <div 
                                        key={upload.configId} 
                                        className="bg-slate-800/60 border border-slate-600/50 rounded-lg p-3"
                                        onDragEnter={handleConfigDragEnter(upload.configId)}
                                        onDragLeave={handleConfigDragLeave(upload.configId)}
                                        onDragOver={handleConfigDragOver(upload.configId)}
                                        onDrop={handleConfigDrop(upload.configId)}
                                    >
                                        <h3 className="text-white font-semibold text-base mb-3">{upload.configName}</h3>
                                        
                                        {/* Two Column Layout */}
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Left Column - File Upload */}
                                            <div>
                                                <label className="cursor-pointer block">
                                                    <div className={`border-2 border-dashed rounded-lg p-3 text-center transition-all duration-200 ${
                                                        draggingConfigId === upload.configId
                                                            ? 'border-indigo-400 bg-indigo-500/20'
                                                            : upload.file 
                                                                ? 'border-green-500/50 bg-green-500/10' 
                                                                : 'border-slate-500/50 bg-slate-700/50 hover:border-indigo-500/50'
                                                    }`}>
                                                        <input
                                                            type="file"
                                                            accept=".xlsx,.xls,.csv"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0] || null;
                                                                handleFileChange(upload.configId, file);
                                                                if (file) saveConfigFileMutation.mutate({ configId: upload.configId, file });
                                                            }}
                                                            className="hidden"
                                                        />
                                                        {upload.file ? (
                                                            <div>
                                                                <p className="text-green-400 font-semibold text-sm">✓ {upload.file.name}</p>
                                                                <FileInfoBadge file={upload.file} />
                                                                <p className="text-white/60 text-xs mt-1">Click or drag to change file</p>
                                                                <FilePreviewButton file={upload.file} />
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <p className="text-white/80 text-sm">
                                                                    {draggingConfigId === upload.configId ? 'Drop file here' : 'Drag & drop or click to upload'}
                                                                </p>
                                                                <p className="text-white/60 text-xs mt-1">Excel or CSV files</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </label>
                                            </div>

                                            {/* Right Column - Settings */}
                                            <div>
                                                <label className="block">
                                                    <span className="text-white/80 text-sm font-medium mb-1 block">Notes Header</span>
                                                    <input
                                                        type="text"
                                                        value={upload.notesHeader}
                                                        onChange={(e) => handleNotesHeaderChange(upload.configId, e.target.value)}
                                                        placeholder="None (use default)"
                                                        className="w-full bg-slate-700/50 border border-slate-600/50 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 placeholder-white/40"
                                                    />
                                                </label>
                                            </div>
                                        </div>
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