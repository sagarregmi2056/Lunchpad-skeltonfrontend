import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import CreateToken from './CreateToken';
import InitializeBondingCurve from './InitializeBondingCurve';

const AdminLayout = ({ children, defaultTab = 'create' }) => {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const router = useRouter();

    // Handle tab change with proper routing
    const handleTabChange = (tab) => {
        setActiveTab(tab);

        // Update URL to match the tab
        if (tab === 'create') {
            router.push('/admin/create-token', undefined, { shallow: true });
        } else if (tab === 'initialize') {
            router.push('/admin/initialize-curve', undefined, { shallow: true });
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-lg overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                    {/* Sidebar navigation */}
                    <div className="w-full sm:w-64 bg-gradient-to-b from-gray-800/80 to-gray-900/80 border-b sm:border-b-0 sm:border-r border-gray-700/50">
                        <div className="p-5 border-b border-gray-700/50 bg-purple-900/10">
                            <h2 className="text-lg font-bold text-white">Admin Panel</h2>
                            <p className="text-gray-400 text-sm">Token Management</p>
                        </div>

                        <div className="p-2">
                            <button
                                onClick={() => handleTabChange('create')}
                                className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center text-sm font-medium transition-all ${activeTab === 'create'
                                    ? 'bg-purple-900/30 text-purple-200'
                                    : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'
                                    }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                                </svg>
                                Create Token
                            </button>

                            <button
                                onClick={() => handleTabChange('initialize')}
                                className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center text-sm font-medium transition-all ${activeTab === 'initialize'
                                    ? 'bg-purple-900/30 text-purple-200'
                                    : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'
                                    }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                                </svg>
                                Initialize Curve
                            </button>

                            <Link href="/" passHref>
                                <button
                                    className="w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center text-sm font-medium transition-all text-gray-300 hover:bg-gray-800/60 hover:text-white"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Back to App
                                </button>
                            </Link>
                        </div>
                    </div>

                    {/* Main content area */}
                    <div className="flex-1 p-5">
                        {activeTab === 'create' && <CreateToken />}
                        {activeTab === 'initialize' && <InitializeBondingCurve />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLayout; 