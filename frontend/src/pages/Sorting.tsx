import React from 'react';
import Layout from '../Layout';

const Sorting: React.FC = () => {
    return (
        <Layout>
            <div className="h-full w-full">
                <h1 className="text-white text-4xl font-bold p-8">PDF Sorting</h1>
                <p className="text-white/80 px-8">Choose: Care Gap Sheet (Key), Folder of PDFs to Sort, Destination Folder</p>
            </div>
        </Layout>
    );
}

export default Sorting;