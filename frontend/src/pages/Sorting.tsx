import React, { useState } from 'react';
import Layout from '../Layout';

const Sorting: React.FC = () => {
    const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "http://localhost:5000").replace(/\/+$/, ''); // Remove trailing slashes
    
    const [masterFile, setMasterFile] = useState<File | null>(null);
    const [pdfFiles, setPdfFiles] = useState<FileList | null>(null);
    const [loading, setLoading] = useState(false);

    const handlePdfFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setPdfFiles(e.target.files);
        }
    };

    const handleSort = async () => {
        if (!masterFile || pdfFiles.length === 0) {
            alert("Please upload all required files");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('masterFile', masterFile);
            
            pdfFiles.forEach((file) => {
                formData.append('pdfFiles', file);
            });
            
            const response = await fetch(`${API_BASE_URL}/api/sort-pdfs`, {
                method: 'POST',
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
                
                alert("PDFs sorted successfully! Check your downloads.");
            } else {
                const error = await response.json();
                alert(`Failed to sort PDFs: ${error.message}`);
            }
        } catch (error) {
            console.error("Error sorting PDFs:", error);
            alert("Error connecting to server");
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
                        <label className="flex-1 cursor-pointer">
                            <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200 ${
                                masterFile 
                                    ? 'border-green-500/50 bg-green-500/10' 
                                    : 'border-slate-500/50 bg-slate-800/50 hover:border-indigo-500/50 hover:bg-slate-700/50'
                            }`}>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
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
                                        <p className="text-white/80 font-semibold text-sm">Click to upload master care gap sheet</p>
                                        <p className="text-white/60 text-xs mt-1">Excel or CSV files (.xlsx, .xls, .csv)</p>
                                    </div>
                                )}
                            </div>
                        </label>
                    </div>
                </div>

                {/* PDF Folder Upload */}
                <div className="flex-1 bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-lg p-4 overflow-hidden flex flex-col">
                    <h2 className="text-white text-lg font-bold mb-2">PDF Folder (Required)</h2>
                    <p className="text-white/70 text-xs mb-3">Select the folder containing all PDFs to be sorted.</p>
                    
                    <label className="flex-1 cursor-pointer flex items-center justify-center">
                        <div className={`w-full h-full border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 flex items-center justify-center ${
                            pdfFiles && pdfFiles.length > 0
                                ? 'border-green-500/50 bg-green-500/10' 
                                : 'border-slate-500/50 bg-slate-800/50 hover:border-indigo-500/50 hover:bg-slate-700/50'
                        }`}>
                            <input
                                type="file"
                                /* @ts-ignore */
                                webkitdirectory=""
                                directory=""
                                multiple
                                accept=".pdf"
                                onChange={handlePdfFolderChange}
                                className="hidden"
                            />
                            {pdfFiles && pdfFiles.length > 0 ? (
                                <div>
                                    <p className="text-green-400 font-semibold text-lg">✓ {pdfFiles.length} PDF files selected</p>
                                    <p className="text-white/60 text-sm mt-2">Click to select a different folder</p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-white/80 font-semibold text-lg">Click to select PDF folder</p>
                                    <p className="text-white/60 text-sm mt-2">All PDFs in the folder will be sorted</p>
                                </div>
                            )}
                        </div>
                    </label>
                </div>

                {/* Sort Button */}
                <div className="bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-lg p-4">
                    <button
                        onClick={handleSort}
                        disabled={!masterFile || !pdfFiles || pdfFiles.length === 0 || loading}
                        className="w-full bg-indigo-600/70 hover:bg-indigo-500/70 border border-indigo-500/50 text-white font-bold text-base px-6 py-3 rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Processing..." : "Sort PDFs"}
                    </button>
                    {(!masterFile || !pdfFiles || pdfFiles.length === 0) && (
                        <p className="text-white/60 text-xs text-center mt-2">
                            {!masterFile ? "Please upload a master file" : "Please select a folder with PDF files"}
                        </p>
                    )}
                </div>
            </div>
        </Layout>
    );
}

export default Sorting;