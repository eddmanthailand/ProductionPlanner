import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut, Radar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'area';
  title?: string;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
      fill?: boolean;
    }>;
  };
  options?: any;
}

interface AIChartProps {
  chartData: ChartData;
  className?: string;
}

export function AIChart({ chartData, className = '' }: AIChartProps) {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            family: 'Inter, sans-serif',
            size: 12
          }
        }
      },
      title: {
        display: !!chartData.title,
        text: chartData.title,
        font: {
          family: 'Inter, sans-serif',
          size: 16,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 30
        }
      }
    },
    scales: chartData.type !== 'pie' && chartData.type !== 'doughnut' ? {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            family: 'Inter, sans-serif',
            size: 11
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#f1f5f9'
        },
        ticks: {
          font: {
            family: 'Inter, sans-serif',
            size: 11
          }
        }
      }
    } : undefined
  };

  // Merge user options with defaults
  const options = { ...defaultOptions, ...chartData.options };

  // Enhance data with better default colors if not provided
  const enhancedData = {
    ...chartData.data,
    datasets: chartData.data.datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
        '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
      ],
      borderColor: dataset.borderColor || (
        chartData.type === 'line' || chartData.type === 'area' ? 
        ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index] : 
        '#374151'
      ),
      borderWidth: dataset.borderWidth || (chartData.type === 'line' ? 3 : 1),
      fill: chartData.type === 'area' ? true : dataset.fill
    }))
  };

  const renderChart = () => {
    const chartProps = {
      data: enhancedData,
      options: options
    };

    switch (chartData.type) {
      case 'bar':
        return <Bar {...chartProps} />;
      case 'line':
      case 'area':
        return <Line {...chartProps} />;
      case 'pie':
        return <Pie {...chartProps} />;
      case 'doughnut':
        return <Doughnut {...chartProps} />;
      case 'radar':
        return <Radar {...chartProps} />;
      default:
        return <Bar {...chartProps} />;
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
      <div style={{ height: '400px', width: '100%' }}>
        {renderChart()}
      </div>
    </div>
  );
}

export default AIChart;