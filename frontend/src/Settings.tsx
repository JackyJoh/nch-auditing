import React from 'react';
import Layout from './Layout';
import Sorting from './Sorting';

const Settings: React.FC = () => {
    return (
        <Layout>
            <div className="h-full w-full">
                <h1 className="text-white text-4xl font-bold p-8">Settings</h1>
                <p className="text-white/80 px-8">App configuration goes here...</p>
                <p className="text-white/80 px-8">Includes column organization setup and appending settings.</p>
            </div>
        </Layout>
    );
}

export default Settings;