import { useState, useEffect } from 'react';
import BuyTokens from './BuyTokens';
import SellTokens from './SellTokens';
import PoolInfo from './PoolInfo';
import CreateToken from './CreateToken';
import UpdateParameters from './UpdateParameters';
import { IconCoin, IconBuy, IconSell, IconInfo, IconSettings } from './Icons';

// Tab definitions
const TABS = [
    {
        id: 'buy',
        label: 'Buy',
        icon: IconBuy,
        component: BuyTokens
    },
    {
        id: 'sell',
        label: 'Sell',
        icon: IconSell,
        component: SellTokens
    },
    {
        id: 'info',
        label: 'Info',
        icon: IconInfo,
        component: PoolInfo
    },
    {
        id: 'create',
        label: 'Create',
        icon: IconCoin,
        component: CreateToken
    },
    {
        id: 'admin',
        label: 'Admin',
        icon: IconSettings,
        component: UpdateParameters
    }
];

const TokenTabs = () => {
    const [activeTab, setActiveTab] = useState('buy');
    const [mounted, setMounted] = useState(false);

    // Handle Next.js hydration
    useEffect(() => {
        setMounted(true);

        // Check URL hash for direct tab access
        const hash = window.location.hash.replace('#', '');
        if (hash && TABS.find(tab => tab.id === hash)) {
            setActiveTab(hash);
        }
    }, []);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        window.location.hash = tabId;
    };

    // Find the active component
    const ActiveComponent = TABS.find(tab => tab.id === activeTab)?.component || TABS[0].component;

    if (!mounted) {
        return null; // Prevent hydration mismatch
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center shadow-glow-md">
                        <IconCoin className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Bonding Curve DEX</h1>
                        <p className="text-gray-400 text-sm">Trade tokens with an on-chain price curve</p>
                    </div>
                </div>

                <div className="bg-purple-900/30 px-3 py-1.5 rounded-full border border-purple-800/40 backdrop-blur-sm">
                    <p className="text-xs font-medium text-purple-300">Network: <span className="text-green-400">Devnet</span></p>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-700/80 mb-6 overflow-x-auto thin-scrollbar">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex items-center text-sm font-medium px-6 py-3 relative overflow-hidden transition-all duration-200 whitespace-nowrap ${activeTab === tab.id
                            ? 'text-purple-300 border-b-2 border-purple-500'
                            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/40'
                            }`}
                    >
                        <tab.icon className={`h-4 w-4 mr-2 ${activeTab === tab.id ? 'text-purple-400' : 'text-gray-500'}`} />
                        {tab.label}

                        {/* Active Tab Indicator */}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
                        )}
                    </button>
                ))}
            </div>

            {/* Active Tab Content */}
            <div className="tab-content min-h-[500px]">
                <ActiveComponent />
            </div>
        </div>
    );
};

export default TokenTabs; 