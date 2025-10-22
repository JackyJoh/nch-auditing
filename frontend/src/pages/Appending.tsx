import React from 'react';
import Layout from '../Layout';

const Appending: React.FC = () => {
    return (
        <Layout>
            <div className="h-full w-full">
                <h1 className="text-white text-4xl font-bold p-8">Master Sheet Appending</h1>
                <p className="text-white/80 px-8">Multiselect of what insurance sheets to select (user creates configs)...</p>
                <p className="text-white/80 px-8">Select sheet for each insurance that will get appended...</p>
                <p className="text-white/80 px-8">For example, if ambetter and cigna, user will select ambetter and cigna sheets to add...</p>
                <p className="text-white/80 px-8">Then select master and care gap key (care gap key could just be saved through settings)</p>
            </div>
        </Layout>
    );
}

export default Appending;