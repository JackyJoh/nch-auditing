import React from 'react';
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen w-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Sidebar */}
      <div className="w-[12.5%] bg-slate-950/50 backdrop-blur-sm border-r border-slate-700/50 flex flex-col p-4">
        <div className="mb-8">
          <h1 className="text-white text-2xl font-bold">NCH Auditing</h1>
        </div>
        <nav className="flex flex-col gap-2">
          <Link to="/" className="text-left text-white/80 hover:text-white hover:bg-white/10 px-4 py-3 rounded-lg transition-all duration-200">
            Home
          </Link>
          <Link to="/sorting" className="text-left text-white/80 hover:text-white hover:bg-white/10 px-4 py-3 rounded-lg transition-all duration-200">
            Sort PDFs
          </Link>
          <Link to="/appending" className="text-left text-white/80 hover:text-white hover:bg-white/10 px-4 py-3 rounded-lg transition-all duration-200">
            Master Sheet
          </Link>
          <Link to="/settings" className="text-left text-white/80 hover:text-white hover:bg-white/10 px-4 py-3 rounded-lg transition-all duration-200">
            Settings
          </Link>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="w-[87.5%] overflow-auto">
        {children}
      </div>
    </div>
  );
};

export default Layout;