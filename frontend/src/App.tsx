import React from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Sorting from './pages/Sorting';
import Appending from './pages/Appending';
import Settings from './pages/settings/Settings';
import InsuranceConfig from './pages/settings/InsuranceConfig';


const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/sorting" element={<Sorting />} />
      <Route path="/appending" element={<Appending />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/insurance-config" element={<InsuranceConfig />} />
      <Route path="/data" element={<div><h2>Data Page</h2><p>This is where data would be displayed.</p></div>} />
      <Route path="*" element={<h2>404 Not Found</h2>} />
    </Routes>
  );
          
};

export default App;