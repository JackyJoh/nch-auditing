import React, { useState } from 'react';
import Layout from '../Layout';

const Contacts: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [contactHeader, setContactHeader] = useState('');
    const [phoneHeader, setPhoneHeader] = useState('');

    // Example handler for backend call
    const handleGenerateVCF = async () => {
        if (!file || !contactHeader || !phoneHeader) return;
        const formData = new FormData();
        formData.append('contactSheet', file);
        formData.append('nameColumn', contactHeader); // <-- match backend
        formData.append('numberColumn', phoneHeader); // <-- match backend

        // Backend call to generate VCF
        try {
            const response = await fetch('/api/contacts', {
                method: 'POST',
                body: formData,
            });
            // Optionally handle download here if backend returns file directly
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
            }
        } catch (error) {
            console.error("Error generating VCF:", error);
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
                            <label className="cursor-pointer flex-1 flex items-center justify-center mb-3">
                                <div className={`w-full border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                                    file
                                        ? 'border-green-500/50 bg-green-500/10'
                                        : 'border-slate-500/50 bg-slate-800/50 hover:border-indigo-500/50'
                                }`}>
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={e => setFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                        name="contactSheet"
                                    />
                                    {file ? (
                                        <div>
                                            <p className="text-green-400 font-semibold">✓ {file.name}</p>
                                            <p className="text-white/60 text-sm mt-1">Click to change</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-white/80 font-semibold">Click to upload contact sheet</p>
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
                                disabled={!file || !contactHeader || !phoneHeader}
                                onClick={handleGenerateVCF}
                            >
                                Generate VCF File
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