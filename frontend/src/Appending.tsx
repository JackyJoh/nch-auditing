import React from 'react';
import Layout from './Layout';

const Appending: React.FC = () => {
    return (
        <Layout>
            <div className="h-full w-full">
                <h1 className="text-white text-4xl font-bold p-8">Master Sheet Appending</h1>
                <p className="text-white/80 px-8">Appending content goes here...</p>
            </div>
        </Layout>
    );
}

export default Appending;