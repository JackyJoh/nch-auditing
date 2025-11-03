import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const clearToken = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Sidebar */}
      <div className="w-[12.5%] bg-slate-950/50 backdrop-blur-sm border-r border-slate-700/50 flex flex-col p-4">
        <div className="mb-8">
          <h1 className="text-white text-2xl font-bold">NCH Auditing</h1>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          <Link to="/" className={`text-left px-4 py-3 rounded-lg transition-all duration-200 ${
            location.pathname === '/' 
              ? 'bg-slate-700/80 text-white border border-slate-500/50' 
              : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}>
            Home
          </Link>
          <Link to="/sorting" className={`text-left px-4 py-3 rounded-lg transition-all duration-200 ${
            location.pathname === '/sorting' 
              ? 'bg-slate-700/80 text-white border border-slate-500/50' 
              : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}>
            Sort PDFs
          </Link>
          <Link to="/appending" className={`text-left px-4 py-3 rounded-lg transition-all duration-200 ${
            location.pathname === '/appending' 
              ? 'bg-slate-700/80 text-white border border-slate-500/50' 
              : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}>
            Master Sheet
          </Link>
          <Link to="/settings" className={`text-left px-4 py-3 rounded-lg transition-all duration-200 ${
            location.pathname.startsWith('/settings')
              ? 'bg-slate-700/80 text-white border border-slate-500/50' 
              : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}>
            Settings
          </Link>
        </nav>
        
        {/* Hidden token clear button for testing - Shift+Click the title */}
        <div 
          onDoubleClick={clearToken}
          className="mt-auto text-white/20 text-xs text-center py-2 cursor-default select-none"
          title="Double-click to clear auth token"
        >
          v1.0
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-[87.5%] overflow-auto">
        {children}
      </div>
    </div>
  );
};

export default Layout;