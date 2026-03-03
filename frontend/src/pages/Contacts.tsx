import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../Layout';
import { FilePreviewButton, FileInfoBadge } from '../components/FilePreviewModal';
import { useToast } from '../contexts/ToastContext';

const Contacts = () => {
    const toast = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [contactHeader, setContactHeader] = useState('');
    const [phoneHeader, setPhoneHeader] = useState('');
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Get API base URL from environment variable, fallback to empty string for local development
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

    // Drag and drop handlers
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        if (
            e.clientX <= rect.left ||
            e.clientX >= rect.right ||
            e.clientY <= rect.top ||
            e.clientY >= rect.bottom
        ) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const droppedFile = files[0];
            const fileName = droppedFile.name.toLowerCase();
            if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
                setFile(droppedFile);
                setFileName(droppedFile.name);
                saveFileMutation.mutate(droppedFile);
            } else {
                toast.warning('Please upload only Excel (.xlsx, .xls) or CSV (.csv) files');
            }
        }
    };

    // Save file to localStorage as base64 string
    const saveFileToLocalStorage = async (file: File) => {
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                localStorage.setItem('contactsFile', reader.result as string);
                localStorage.setItem('contactsFileName', file.name);
                resolve();
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Load file from localStorage
    const loadFileFromLocalStorage = () => {
        const base64 = localStorage.getItem('contactsFile');
        const name = localStorage.getItem('contactsFileName') || '';
        if (!base64) return null;
        const arr = base64.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || '';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], name, { type: mime });
    };

    // React Query for loading file
    const { data: savedFile } = useQuery({
        queryKey: ['contactsFile'],
        queryFn: loadFileFromLocalStorage,
    });

    // Mutation for saving file
    const queryClient = useQueryClient();
    const saveFileMutation = useMutation({
        mutationFn: saveFileToLocalStorage,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contactsFile'] });
        },
    });

    // On mount, load file from localStorage if exists
    useEffect(() => {
        if (savedFile) {
            setFile(savedFile);
            setFileName(savedFile.name);
        }
    }, [savedFile]);

    


    // Example handler for backend call
    const handleGenerateVCF = async () => {
        if (!file || !contactHeader || !phoneHeader) return;
        setLoading(true);
        const formData = new FormData();
        formData.append('contactSheet', file);
        formData.append('nameColumn', contactHeader);
        formData.append('numberColumn', phoneHeader);
        try {
            const response = await fetch(`${API_BASE_URL}/api/contact-list`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || 'authenticated'}`,
                },
                body: formData,
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'contacts.vcf';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success('VCF generated successfully.');
            } else {
                // Try parse JSON error message, else show generic text
                let errText = 'Failed to generate VCF';
                try {
                    const errJson = await response.json();
                    errText = errJson.message || JSON.stringify(errJson);
                } catch {
                    try {
                        errText = await response.text();
                    } catch {}
                }
                toast.error(`Error: ${errText}`);
            }
        } catch (error: any) {
            console.error('Error generating VCF:', error);
            toast.error(`Error generating VCF: ${error?.message || String(error)}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="p-4 h-full min-h-screen flex flex-col">
                <div className="mb-6">
                    <h1 className="text-white text-4xl font-bold mb-3">Contacts VCF Generator</h1>
                    <p className="text-white/60 text-lg">
                        Upload a physician contact sheet and specify the column headers to generate a VCF file.
                    </p>
                </div>
                <div className="flex flex-col gap-4 flex-1 h-full">
                    <div className="flex flex-col justify-center h-1/2">
                        <div className="transition-all duration-200 ease-in-out relative overflow-hidden bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-lg p-6 flex flex-col h-full">
                            <div className="text-center mb-4">
                                <h2 className="text-3xl font-extrabold mb-3 tracking-tight text-white">Upload Contact Sheet</h2>
                                <p className="text-base opacity-90 leading-relaxed text-white/90">
                                    Excel or CSV file containing physician contact information
                                </p>
                            </div>
                            {/* Contact Sheet File Input */}
                            <label 
                                className="cursor-pointer flex-1 flex items-center justify-center mb-3"
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                            >
                                <div className={`w-full border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                                    isDragging
                                        ? 'border-indigo-400 bg-indigo-500/20'
                                        : file
                                            ? 'border-green-500/50 bg-green-500/10'
                                            : 'border-slate-500/50 bg-slate-800/50 hover:border-indigo-500/50'
                                }`}>
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={e => {
                                            const f = e.target.files?.[0] || null;
                                            setFile(f);
                                            setFileName(f?.name || '');
                                            if (f) saveFileMutation.mutate(f);
                                        }}
                                        className="hidden"
                                        name="contactSheet"
                                    />
                                    {file ? (
                                        <div>
                                            <p className="text-green-400 font-semibold">✓ {fileName}</p>
                                            <FileInfoBadge file={file} />
                                            <p className="text-white/60 text-sm mt-1">Click or drag to change</p>
                                            <FilePreviewButton file={file} />
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-white/80 font-semibold">
                                                {isDragging ? 'Drop file here' : 'Drag & drop or click to upload'}
                                            </p>
                                            <p className="text-white/60 text-sm mt-1">Excel or CSV files</p>
                                        </div>
                                    )}
                                </div>
                            </label>
                        </div>
                    </div>
                    <div className="flex flex-col justify-center h-1/2">
                        <div className="transition-all duration-200 ease-in-out relative overflow-hidden bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-lg p-6 flex flex-col h-full justify-center">
                            {/* Contact Name Column Header Input */}
                            <div className="mb-6">
                                <label className="block text-white font-semibold mb-1" htmlFor="contactHeader">
                                    Contact Name Column Header <span className="text-white/60 text-xs">(e.g. Physician Name)</span>
                                </label>
                                <input
                                    id="contactHeader"
                                    name="contactHeader"
                                    type="text"
                                    value={contactHeader}
                                    onChange={e => setContactHeader(e.target.value)}
                                    placeholder="Physician Name"
                                    className="block w-full text-white bg-slate-900/40 border border-slate-600/50 rounded-lg px-4 py-2"
                                />
                            </div>
                            {/* Phone Number Column Header Input */}
                            <div className="mb-6">
                                <label className="block text-white font-semibold mb-1" htmlFor="phoneHeader">
                                    Phone Number Column Header <span className="text-white/60 text-xs">(e.g. Provider Phone)</span>
                                </label>
                                <input
                                    id="phoneHeader"
                                    name="phoneHeader"
                                    type="text"
                                    value={phoneHeader}
                                    onChange={e => setPhoneHeader(e.target.value)}
                                    placeholder="Provider Phone"
                                    className="block w-full text-white bg-slate-900/40 border border-slate-600/50 rounded-lg px-4 py-2"
                                />
                            </div>
                        </div>
                        <div className="bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-lg p-4 mt-4 w-full flex flex-col items-center">
                            <button
                                className="w-full bg-indigo-600/70 hover:bg-indigo-500/70 border border-indigo-500/50 text-white font-bold text-base px-6 py-3 rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!file || !contactHeader || !phoneHeader || loading}
                                onClick={handleGenerateVCF}
                            >
                                {loading ? 'Processing...' : 'Generate VCF File'}
                            </button>
                            {!file && (
                                <span className="text-white/60 text-xs text-center mt-2">
                                    Please upload contact sheet.
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Contacts;