import React from 'react';

export const IconCoin = ({ className = "h-5 w-5", stroke = "currentColor", fill = "none" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={fill} viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const IconBuy = ({ className = "h-5 w-5", stroke = "currentColor", fill = "none" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={fill} viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
);

export const IconSell = ({ className = "h-5 w-5", stroke = "currentColor", fill = "none" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={fill} viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
);

export const IconInfo = ({ className = "h-5 w-5", stroke = "currentColor", fill = "none" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={fill} viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const IconWallet = ({ className = "h-5 w-5", stroke = "currentColor", fill = "none" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={fill} viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

export const IconLock = ({ className = "h-5 w-5", stroke = "currentColor", fill = "none" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={fill} viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

export const IconError = ({ className = "h-5 w-5", stroke = "currentColor", fill = "none" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={fill} viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const IconSuccess = ({ className = "h-5 w-5", stroke = "currentColor", fill = "none" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={fill} viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const IconLoading = ({ className = "h-5 w-5 animate-spin", stroke = "currentColor", fill = "none" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={fill} viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

export const IconExternal = ({ className = "h-5 w-5", stroke = "currentColor", fill = "none" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={fill} viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
);

export const IconCopy = ({ className = "h-5 w-5", stroke = "currentColor", fill = "none" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={fill} viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
);

export const IconPrice = ({ className = "h-5 w-5", stroke = "currentColor", fill = "none" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={fill} viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

export const IconSupply = ({ className = "h-5 w-5", stroke = "currentColor", fill = "none" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={fill} viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
);

export const IconHero = ({ className = "h-5 w-5", stroke = "currentColor", fill = "none" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={fill} viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
    </svg>
);

export const IconSlope = ({ className = "h-5 w-5", stroke = "currentColor", fill = "none" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={fill} viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

// Loading spinner component
export const LoadingSpinner = ({ size = "sm", color = "indigo" }) => {
    const sizeClasses = {
        xs: "h-3 w-3",
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-8 w-8",
        xl: "h-10 w-10"
    };

    const colorClasses = {
        white: "text-white",
        gray: "text-gray-500",
        indigo: "text-indigo-500",
        purple: "text-purple-500",
        blue: "text-blue-500"
    };

    return (
        <svg
            className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            ></circle>
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
        </svg>
    );
};

// Network badge component
export const NetworkBadge = ({ network = "devnet" }) => {
    const getColor = () => {
        switch (network.toLowerCase()) {
            case 'mainnet':
                return 'bg-green-900/40 text-green-400 border-green-700/40';
            case 'testnet':
                return 'bg-yellow-900/40 text-yellow-400 border-yellow-700/40';
            case 'devnet':
            default:
                return 'bg-indigo-900/40 text-indigo-300 border-indigo-700/40';
        }
    };

    return (
        <div className={`inline-flex items-center px-2 py-1 ${getColor()} rounded-full border text-xs`}>
            <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            {network}
        </div>
    );
};

// Status badge component
export const StatusBadge = ({ status = "active" }) => {
    const getColor = () => {
        switch (status.toLowerCase()) {
            case 'active':
                return 'bg-green-900/40 text-green-400 border-green-700/40';
            case 'pending':
                return 'bg-yellow-900/40 text-yellow-400 border-yellow-700/40';
            case 'inactive':
                return 'bg-red-900/40 text-red-400 border-red-700/40';
            default:
                return 'bg-indigo-900/40 text-indigo-300 border-indigo-700/40';
        }
    };

    return (
        <div className={`inline-flex items-center px-2 py-1 ${getColor()} rounded-full border text-xs`}>
            <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            {status}
        </div>
    );
}; 