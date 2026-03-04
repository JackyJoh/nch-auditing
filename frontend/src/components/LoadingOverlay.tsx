import React from 'react';

interface Props {
    message?: string;
}

const LoadingOverlay: React.FC<Props> = ({ message = 'Processing...' }) => {
    return (
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm z-10 rounded-xl flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
                <p className="text-white font-semibold text-lg">{message}</p>
            </div>
        </div>
    );
};

export default LoadingOverlay;
