import React, { useState, useEffect } from 'react';
import Layout from '../Layout';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FilePreviewButton, FileInfoBadge } from '../components/FilePreviewModal';
import { useToast } from '../contexts/ToastContext';

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

    const handleZipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setZipFile(file); // Only allow one .zip file
            saveZipFileMutation.mutate(file);
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
            } else {
                toast.warning('Please upload only ZIP (.zip) files');
            }
        }
    };

    const handleSort = async () => {
        if (!masterFile || !zipFile) {
            toast.warning("Please upload all required files");
            return;
        }

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
                a.download = 'sorted_pdfs.zip';
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
            <div className="p-4 h-full flex flex-col gap-3">
                {/* Master File Upload */}
                <div className="bg-slate-700/60 backdrop-blur-sm border-2 border-indigo-500/50 rounded-xl shadow-lg p-4">
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
                </div>

                {/* ZIP File Upload */}
                <div className="flex-1 bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-lg p-4 overflow-hidden flex flex-col">
                    <h2 className="text-white text-lg font-bold mb-2">PDF ZIP File (Required)</h2>
                    <p className="text-white/70 text-xs mb-3">Upload a ZIP file containing all PDFs to be sorted.</p>
                    
                    <label 
                        className="flex-1 cursor-pointer flex items-center justify-center"
                        onDragEnter={handleZipDragEnter}
                        onDragLeave={handleZipDragLeave}
                        onDragOver={handleZipDragOver}
                        onDrop={handleZipDrop}
                    >
                        <div className={`w-full h-full border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 flex items-center justify-center ${
                            isDraggingZip
                                ? 'border-indigo-400 bg-indigo-500/20'
                                : zipFile
                                    ? 'border-green-500/50 bg-green-500/10' 
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
                                    <p className="text-green-400 font-semibold text-lg">✓ {zipFile.name}</p>
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
                </div>

                {/* Sort Button */}
                <div className="bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-lg p-4">
                    <button
                        onClick={handleSort}
                        disabled={!masterFile || !zipFile || loading}
                        className="w-full bg-indigo-600/70 hover:bg-indigo-500/70 border border-indigo-500/50 text-white font-bold text-base px-6 py-3 rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Processing..." : "Sort PDFs"}
                    </button>
                    {(!masterFile || !zipFile) && (
                        <p className="text-white/60 text-xs text-center mt-2">
                            {!masterFile ? "Please upload a master file" : "Please upload a ZIP file containing PDFs"}
                        </p>
                    )}
                </div>
            </div>
        </Layout>
    );
}

export default Sorting;