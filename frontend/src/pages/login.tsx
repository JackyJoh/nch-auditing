import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated, login } = useAuth();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            const success = await login(password);
            if (success) {
                navigate('/');
            } else {
                setError('Incorrect password');
                setPassword('');
            }
        } catch (error) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
            <div className="bg-slate-700/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-2xl p-8 flex flex-col justify-center font-mono"
                 style={{ width: '450px', height: '600px' }}>

                <div className="text-center mb-8">
                    <h1 className="text-white text-5xl font-bold mb-3">NCH Auditing</h1>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg px-4 py-3 text-white text-lg font-mono focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                            placeholder="Password"
                            required
                            disabled={loading}
                        />
                        {error && (
                            <p className="text-red-400 text-sm mt-2">{error}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-indigo-600/70 hover:bg-indigo-500/70 border border-indigo-500/50 text-white font-bold text-lg px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!password || loading}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );  
};

export default Login;