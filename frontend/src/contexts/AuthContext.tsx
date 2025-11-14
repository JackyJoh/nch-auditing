import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
    isAuthenticated: boolean;
    login: (password: string) => Promise<boolean>;  // Changed to Promise<boolean>
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    // Check if user is already logged in on mount
    useEffect(() => {
        const authToken = localStorage.getItem('authToken'); // CHANGED from 'auth_token'
        const loginTime = localStorage.getItem('login_time');
        
        if (authToken && loginTime) {
            const now = new Date().getTime();
            const loginTimestamp = parseInt(loginTime);
            const hoursSinceLogin = (now - loginTimestamp) / (1000 * 60 * 60);

            // Token expires after 1 hour
            if (hoursSinceLogin < 1) {
                setIsAuthenticated(true);
            } else {
                // Token expired, clear it
                localStorage.removeItem('authToken'); // CHANGED from 'auth_token'
                localStorage.removeItem('login_time');
                setIsAuthenticated(false);
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (password: string): Promise<boolean> => {
        try {
            const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ password }),
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.token) {
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('login_time', new Date().getTime().toString());
                    setIsAuthenticated(true);
                    return true;
                }
                return false;
            }
            return false;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const logout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('authToken'); // CHANGED from 'auth_token'
        localStorage.removeItem('login_time');
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {isLoading ? null : children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
