import React, { useState, useEffect } from 'react';
import Layout from '../Layout';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FilePreviewButton, FileInfoBadge } from '../components/FilePreviewModal';
import { useToast } from '../contexts/ToastContext';
import LoadingOverlay from '../components/LoadingOverlay';

const Sorting: React.FC = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const queryClient = useQueryClient();
    const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "http://localhost:5000").replace(/\/+$/, ''); // Remove trailing slashes
    
    const [masterFile, setMasterFile] = useState<File | null>(null);
    const [zipFile, setZipFile] = useState<File | null>(null); // Updated to handle .zip file
    const [loading, setLoading] = useState(false);
    const [isDraggingMaster, setIsDraggingMaster] = useState(false);
    const [isDraggingZip, setIsDraggingZip] = useState(false);
    const [showValidation, setShowValidation] = useState(false);

    const warnIfLarge = (file: File, limitMB: number) => {
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > limitMB) toast.warning(`${file.name} is ${sizeMB.toFixed(0)}MB — processing may be slow`);
    };

    const fileAge = (file: File): string => {
        const diff = Date.now() - file.lastModified;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(file.lastModified).toLocaleDateString();
    };

    // Save file to localStorage as base64 string
    const saveFileToLocalStorage = async (key: string, file: File) => {
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                localStorage.setItem(key, reader.result as string);
                localStorage.setItem(`${key}_name`, file.name);
                localStorage.setItem(`${key}_lastModified`, file.lastModified.toString());
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
        const lastModified = parseInt(localStorage.getItem(`${key}_lastModified`) || '0') || Date.now();
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
            return new File([u8arr], name, { type: mime, lastModified });
        } catch (error) {
            console.error('Error loading file from localStorage:', error);
            return null;
        }
    };

    // React Query for loading master file
    const { data: savedMasterFile } = useQuery({
        queryKey: ['sortingMasterFile'],
        queryFn: () => loadFileFromLocalStorage('sorting_master'),
    });

    // React Query for loading zip file
    const { data: savedZipFile } = useQuery({
        queryKey: ['sortingZipFile'],
        queryFn: () => loadFileFromLocalStorage('sorting_zip'),
    });

    // Mutation for saving master file
    const saveMasterFileMutation = useMutation({
        mutationFn: (file: File) => saveFileToLocalStorage('sorting_master', file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sortingMasterFile'] });
        },
    });

    // Mutation for saving zip file
    const saveZipFileMutation = useMutation({
        mutationFn: (file: File) => saveFileToLocalStorage('sorting_zip', file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sortingZipFile'] });
        },
    });

    const clearMasterFile = () => {
        setMasterFile(null);
        localStorage.removeItem('sorting_master');
        localStorage.removeItem('sorting_master_name');
        queryClient.invalidateQueries({ queryKey: ['sortingMasterFile'] });
    };

    const clearZipFile = () => {
        setZipFile(null);
        localStorage.removeItem('sorting_zip');
        localStorage.removeItem('sorting_zip_name');
        queryClient.invalidateQueries({ queryKey: ['sortingZipFile'] });
    };

    const clearAllFiles = () => {
        clearMasterFile();
        clearZipFile();
    };

    // On mount, load master file from localStorage if exists
    useEffect(() => {
        if (savedMasterFile) {
            setMasterFile(savedMasterFile);
        }
    }, [savedMasterFile]);

    // On mount, load zip file from localStorage if exists
    useEffect(() => {
        if (savedZipFile) {
            setZipFile(savedZipFile);
        }
    }, [savedZipFile]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'Enter' && !loading) {
                handleSort();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [masterFile, zipFile, loading]);

    const handleZipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setZipFile(file); // Only allow one .zip file
            saveZipFileMutation.mutate(file);
            warnIfLarge(file, 50);
        }
    };

    // Master file drag handlers
    const handleMasterDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingMaster(true);
    };

    const handleMasterDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
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
                warnIfLarge(file, 15);
            } else {
                toast.warning('Please upload only Excel (.xlsx, .xls) or CSV (.csv) files');
            }
        }
    };

    // ZIP file drag handlers
    const handleZipDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingZip(true);
    };

    const handleZipDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        if (
            e.clientX <= rect.left ||
            e.clientX >= rect.right ||
            e.clientY <= rect.top ||
            e.clientY >= rect.bottom
        ) {
            setIsDraggingZip(false);
        }
    };

    const handleZipDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingZip(true);
    };

    const handleZipDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingZip(false);
        
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            const fileName = file.name.toLowerCase();
            if (fileName.endsWith('.zip')) {
                setZipFile(file);
                saveZipFileMutation.mutate(file);
                warnIfLarge(file, 50);
            } else {
                toast.warning('Please upload only ZIP (.zip) files');
            }
        }
    };

    const handleSort = async () => {
        if (!masterFile || !zipFile) {
            setShowValidation(true);
            return;
        }
        setShowValidation(false);

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('masterFile', masterFile);
            formData.append('zipFile', zipFile); // Append the .zip file
            
            const response = await fetch(`${API_BASE_URL}/api/sort-pdfs`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || 'authenticated'}`,
                },
                body: formData,
            });

            if (response.ok) {
                // Get the ZIP blob
                const blob = await response.blob();
                
                // Create download link
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `sorted_pdfs_${new Date().toISOString().slice(0, 10)}.zip`;
                document.body.appendChild(a);
                a.click();
                
                // Cleanup
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                // Invalidate cache to refresh history
                queryClient.invalidateQueries({ queryKey: ['history'] });
                
                toast.success("PDFs sorted successfully! Check your downloads.");
            } else {
                const error = await response.json();
                toast.error(`Failed to sort PDFs: ${error.message}`);
            }
        } catch (error) {
            console.error("Error sorting PDFs:", error);
            toast.error("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="p-4 h-full flex flex-col gap-3 relative">
                {loading && <LoadingOverlay message="Sorting PDFs..." />}
                {/* Master File Upload */}
                <div className="bg-slate-700/60 border-2 border-indigo-500/50 rounded-xl shadow-lg p-4">
                    <h2 className="text-white text-lg font-bold mb-2">Master File (Required)</h2>
                    <p className="text-white/70 text-xs mb-3">Upload the master care gap sheet that will be used as the key for sorting PDFs.</p>
                    
                    <div className="flex items-center gap-4">
                        <label 
                            className="flex-1 cursor-pointer"
                            onDragEnter={handleMasterDragEnter}
                            onDragLeave={handleMasterDragLeave}
                            onDragOver={handleMasterDragOver}
                            onDrop={handleMasterDrop}
                        >
                            <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors duration-200 ${
                                isDraggingMaster
                                    ? 'border-indigo-400 bg-indigo-500/20'
                                    : masterFile
                                        ? 'border-green-500/50 bg-green-500/10'
                                        : showValidation
                                            ? 'border-red-500/60 bg-red-500/10'
                                            : 'border-slate-500/50 bg-slate-800/50 hover:border-indigo-500/50 hover:bg-slate-700/50'
                            }`}>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        setMasterFile(file);
                                        if (file) { saveMasterFileMutation.mutate(file); warnIfLarge(file, 15); }
                                    }}
                                    className="hidden"
                                />
                                {masterFile ? (
                                    <div>
                                        <div className="flex items-center justify-center gap-2">
                                            <p className="text-green-400 font-semibold text-sm">✓ {masterFile.name} <span className="text-white/40 font-normal text-xs">· {fileAge(masterFile)}</span></p>
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearMasterFile(); }}
                                                className="text-white/40 hover:text-red-400 transition-colors leading-none text-lg"
                                            >×</button>
                                        </div>
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
                        {showValidation && !masterFile && <p className="text-red-400 text-xs mt-1 text-center">Required</p>}
                    </div>
                </div>

                {/* ZIP File Upload */}
                <div className="flex-1 bg-slate-700/60 border border-slate-600/50 rounded-xl shadow-lg p-4 overflow-hidden flex flex-col">
                    <h2 className="text-white text-lg font-bold mb-2">PDF ZIP File (Required)</h2>
                    <p className="text-white/70 text-xs mb-3">Upload a ZIP file containing all PDFs to be sorted.</p>
                    
                    <label 
                        className="flex-1 cursor-pointer flex items-center justify-center"
                        onDragEnter={handleZipDragEnter}
                        onDragLeave={handleZipDragLeave}
                        onDragOver={handleZipDragOver}
                        onDrop={handleZipDrop}
                    >
                        <div className={`w-full h-full border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 flex items-center justify-center ${
                            isDraggingZip
                                ? 'border-indigo-400 bg-indigo-500/20'
                                : zipFile
                                    ? 'border-green-500/50 bg-green-500/10'
                                    : showValidation
                                        ? 'border-red-500/60 bg-red-500/10'
                                        : 'border-slate-500/50 bg-slate-800/50 hover:border-indigo-500/50 hover:bg-slate-700/50'
                        }`}>
                            <input
                                type="file"
                                accept=".zip"
                                onChange={handleZipFileChange}
                                className="hidden"
                            />
                            {zipFile ? (
                                <div>
                                    <div className="flex items-center justify-center gap-2">
                                        <p className="text-green-400 font-semibold text-lg">✓ {zipFile.name} <span className="text-white/40 font-normal text-xs">· {fileAge(zipFile)}</span></p>
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearZipFile(); }}
                                            className="text-white/40 hover:text-red-400 transition-colors leading-none text-xl"
                                        >×</button>
                                    </div>
                                    <FileInfoBadge file={zipFile} />
                                    <p className="text-white/60 text-sm mt-2">Click or drag to change ZIP file</p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-white/80 font-semibold text-lg">
                                        {isDraggingZip ? 'Drop ZIP file here' : 'Drag & drop or click to upload'}
                                    </p>
                                    <p className="text-white/60 text-sm mt-2">The ZIP file must contain all PDFs to be sorted</p>
                                </div>
                            )}
                        </div>
                    </label>
                    {showValidation && !zipFile && <p className="text-red-400 text-xs mt-1 text-center">Required</p>}
                </div>

                {/* Sort Button */}
                <div className="bg-slate-700/60 border border-slate-600/50 rounded-xl shadow-lg p-4 flex gap-3">
                    <button
                        onClick={handleSort}
                        disabled={loading}
                        className="flex-1 bg-indigo-600/70 hover:bg-indigo-500/70 border border-indigo-500/50 text-white font-bold text-base px-6 py-3 rounded-lg transition-colors duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Processing..." : <span>Sort PDFs <span className="text-white/40 font-normal text-xs ml-1">Ctrl+Enter</span></span>}
                    </button>
                    {(masterFile || zipFile) && (
                        <button
                            onClick={clearAllFiles}
                            disabled={loading}
                            className="bg-slate-600/60 hover:bg-red-500/20 border border-slate-500/50 hover:border-red-500/50 text-white/50 hover:text-red-400 text-sm font-medium px-4 py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Clear All
                        </button>
                    )}
                </div>
            </div>
        </Layout>
    );
}

export default Sorting;