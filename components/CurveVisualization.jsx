import React, { useEffect, useRef, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Curve type options
const CURVE_TYPES = {
    LINEAR: 'linear',
    EXPONENTIAL: 'exponential',
    SQRT: 'sqrt',
    SIGMOID: 'sigmoid'
};

const CurveVisualization = ({
    initialPrice = 0.001,
    slope = 0.0001,
    currentSupply = 0,
    height = '180px',
    curveType = CURVE_TYPES.LINEAR
}) => {
    // Calculate price based on curve type
    const calculatePrice = (supply) => {
        switch (curveType) {
            case CURVE_TYPES.EXPONENTIAL:
                // y = a * e^(bx)
                return initialPrice * Math.exp(slope * supply);
            case CURVE_TYPES.SQRT:
                // y = a + b * √x
                return initialPrice + slope * Math.sqrt(supply);
            case CURVE_TYPES.SIGMOID:
                // Sigmoid function: y = a + (b / (1 + e^(-cx)))
                const c = 0.001; // Growth rate parameter
                return initialPrice + (slope / (1 + Math.exp(-c * (supply - 1000))));
            case CURVE_TYPES.LINEAR:
            default:
                // y = a + bx (Linear curve)
                return initialPrice + (slope * supply);
        }
    };

    // Calculate data points for the bonding curve
    const generateCurveData = () => {
        // Generate data points for the curve
        const maxSupply = Math.max(3000, currentSupply * 2); // Ensure we show at least double the current supply
        const dataPoints = 100; // Number of points to plot

        // Create labels and data arrays
        const labels = [];
        const priceData = [];

        // Calculate price points along the curve
        for (let i = 0; i <= dataPoints; i++) {
            const supply = (i / dataPoints) * maxSupply;
            const price = calculatePrice(supply);

            labels.push(supply.toFixed(0));
            priceData.push(price);
        }

        return { labels, priceData };
    };

    const { labels, priceData } = useMemo(() => generateCurveData(), [initialPrice, slope, currentSupply, curveType]);

    // Calculate the current position on the curve
    const currentPosition = useMemo(() => ({
        x: currentSupply,
        y: calculatePrice(currentSupply)
    }), [currentSupply, initialPrice, slope, curveType]);

    // Find the closest index to current supply for highlighting
    let currentIndex = 0;
    if (currentSupply > 0) {
        const maxSupply = Math.max(3000, currentSupply * 2);
        currentIndex = Math.round((currentSupply / maxSupply) * 100);
    }

    // Chart configuration
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index'
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Supply',
                    color: 'rgba(156, 163, 175, 0.9)'
                },
                grid: {
                    display: false,
                },
                ticks: {
                    color: 'rgba(156, 163, 175, 0.7)',
                    callback: function (value, index, values) {
                        // Show fewer ticks for readability
                        if (index % 20 === 0) return labels[index];
                        return '';
                    }
                }
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: 'Price (SOL)',
                    color: 'rgba(156, 163, 175, 0.9)'
                },
                grid: {
                    color: 'rgba(55, 65, 81, 0.3)',
                },
                ticks: {
                    color: 'rgba(156, 163, 175, 0.7)',
                    callback: function (value) {
                        return value.toFixed(4);
                    }
                }
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                borderColor: 'rgba(107, 114, 128, 0.5)',
                borderWidth: 1,
                titleColor: 'rgb(167, 139, 250)',
                bodyColor: 'rgb(209, 213, 219)',
                callbacks: {
                    title: (tooltipItems) => {
                        return `Supply: ${tooltipItems[0].label}`;
                    },
                    label: (context) => {
                        return `Price: ${context.parsed.y.toFixed(6)} SOL`;
                    }
                }
            }
        }
    };

    const data = {
        labels,
        datasets: [
            {
                label: 'Bonding Curve',
                data: priceData,
                borderColor: 'rgba(139, 92, 246, 0.8)',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: 'rgb(139, 92, 246)',
                pointHoverBorderColor: 'rgb(255, 255, 255)',
                pointHoverBorderWidth: 2,
                tension: 0.4,
                fill: true
            }
        ]
    };

    // If we have current supply, add a point to show current position
    if (currentSupply > 0) {
        data.datasets.push({
            label: 'Current Position',
            data: Array(labels.length).fill(null).map((_, i) => {
                return i === currentIndex ? currentPosition.y : null;
            }),
            borderColor: 'rgba(59, 130, 246, 0)',
            pointBackgroundColor: 'rgba(244, 114, 182, 1)',
            pointBorderColor: 'rgba(255, 255, 255, 1)',
            pointRadius: 5,
            pointHoverRadius: 7,
        });
    }

    return (
        <div className="relative">
            <div style={{ height }} className="w-full">
                <Line options={options} data={data} />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-gray-900/60 to-transparent pointer-events-none"></div>
        </div>
    );
};

export default CurveVisualization; 