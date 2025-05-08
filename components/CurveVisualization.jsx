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
        const maxSupply = Math.max(5000, currentSupply * 2); // Ensure we show more future growth potential
        const dataPoints = 120; // Increased for smoother curve

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
        const maxSupply = Math.max(5000, currentSupply * 2);
        currentIndex = Math.round((currentSupply / maxSupply) * 120);
    }

    // Chart configuration with improved styling
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index'
        },
        animation: {
            duration: 1000,
            easing: 'easeOutQuart'
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Supply',
                    color: 'rgba(179, 183, 197, 0.9)',
                    font: {
                        size: 11,
                        weight: '500'
                    }
                },
                grid: {
                    display: false,
                },
                ticks: {
                    color: 'rgba(179, 183, 197, 0.7)',
                    maxRotation: 0,
                    autoSkip: true,
                    font: {
                        size: 10
                    },
                    callback: function (value, index, values) {
                        // Show fewer ticks for readability
                        if (index % 30 === 0) {
                            return Number(labels[index]).toLocaleString();
                        }
                        return '';
                    }
                }
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: 'Price (SOL)',
                    color: 'rgba(179, 183, 197, 0.9)',
                    font: {
                        size: 11,
                        weight: '500'
                    }
                },
                grid: {
                    color: 'rgba(71, 85, 105, 0.2)',
                    lineWidth: 0.5
                },
                ticks: {
                    color: 'rgba(179, 183, 197, 0.7)',
                    font: {
                        size: 10
                    },
                    callback: function (value) {
                        return value.toFixed(5);
                    }
                }
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(22, 27, 42, 0.95)',
                borderColor: 'rgba(147, 51, 234, 0.5)',
                borderWidth: 1,
                titleColor: 'rgb(179, 183, 197)',
                bodyColor: 'rgb(236, 237, 244)',
                titleFont: {
                    weight: 'normal',
                    size: 12
                },
                bodyFont: {
                    size: 13,
                    weight: 'bold'
                },
                padding: 10,
                cornerRadius: 8,
                boxPadding: 5,
                usePointStyle: true,
                callbacks: {
                    title: (tooltipItems) => {
                        return `Supply: ${Number(tooltipItems[0].label).toLocaleString()} tokens`;
                    },
                    label: (context) => {
                        return `Price: ${context.parsed.y.toFixed(6)} SOL`;
                    },
                    labelPointStyle: () => {
                        return {
                            pointStyle: 'circle',
                            rotation: 0
                        };
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
                borderColor: 'rgba(147, 51, 234, 0.8)',
                backgroundColor: ctx => {
                    const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
                    gradient.addColorStop(0, 'rgba(147, 51, 234, 0.2)');
                    gradient.addColorStop(1, 'rgba(147, 51, 234, 0.0)');
                    return gradient;
                },
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: 'rgb(147, 51, 234)',
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
            pointRadius: 6,
            pointHoverRadius: 8,
            pointStyle: 'circle',
            pointBorderWidth: 2,
            hoverBorderWidth: 3
        });
    }

    return (
        <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/30">
            <div style={{ height }} className="w-full px-2 pt-2 pb-4">
                <Line options={options} data={data} />
            </div>

            {/* Animated gradient overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-30 animated-gradient-bg" style={{ mixBlendMode: 'soft-light' }}></div>

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-1/6 bg-gradient-to-t from-gray-900/90 to-transparent pointer-events-none"></div>

            {/* Current price indicator */}
            {currentSupply > 0 && (
                <div className="absolute top-3 right-3 bg-purple-900/70 backdrop-blur-sm rounded-md px-3 py-1.5 border border-purple-800/50 text-xs font-medium text-purple-200 shadow-lg">
                    Current: {currentPosition.y.toFixed(6)} SOL
                </div>
            )}
        </div>
    );
};

export default CurveVisualization; 