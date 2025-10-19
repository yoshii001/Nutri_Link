import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Circle, Text as SvgText, Polyline } from 'react-native-svg';

interface ChartDataPoint {
  date: string;
  amount: number;
}

interface MiniDonationChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
}

export default function MiniDonationChart({ 
  data, 
  width = 320, 
  height = 180 
}: MiniDonationChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No donation data available</Text>
      </View>
    );
  }

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate max value for scaling
  const maxAmount = Math.max(...data.map(d => d.amount), 1);
  const yScale = chartHeight / maxAmount;
  const xScale = chartWidth / (data.length - 1 || 1);

  // Generate points for the line
  const points = data.map((d, i) => ({
    x: padding.left + (i * xScale),
    y: padding.top + chartHeight - (d.amount * yScale),
  }));

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  // Format dates for labels (show only first, middle, and last)
  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Donation Trend (Last 7 Days)</Text>
      <Svg width={width} height={height}>
        {/* Y-axis */}
        <Line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartHeight}
          stroke="#ddd"
          strokeWidth="2"
        />
        
        {/* X-axis */}
        <Line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke="#ddd"
          strokeWidth="2"
        />

        {/* Y-axis labels */}
        <SvgText
          x={padding.left - 10}
          y={padding.top + 5}
          fontSize="10"
          fill="#666"
          textAnchor="end"
        >
          ${maxAmount.toFixed(0)}
        </SvgText>
        <SvgText
          x={padding.left - 10}
          y={padding.top + chartHeight + 5}
          fontSize="10"
          fill="#666"
          textAnchor="end"
        >
          $0
        </SvgText>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((ratio, i) => (
          <Line
            key={`grid-${i}`}
            x1={padding.left}
            y1={padding.top + chartHeight * ratio}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight * ratio}
            stroke="#f0f0f0"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        ))}

        {/* Line chart */}
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke="#007AFF"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, i) => (
          <Circle
            key={`point-${i}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#007AFF"
            stroke="#fff"
            strokeWidth="2"
          />
        ))}

        {/* X-axis labels - show first, middle, and last */}
        {data.length > 0 && (
          <>
            <SvgText
              x={padding.left}
              y={padding.top + chartHeight + 20}
              fontSize="10"
              fill="#666"
              textAnchor="middle"
            >
              {getDateLabel(data[0].date)}
            </SvgText>
            {data.length > 2 && (
              <SvgText
                x={padding.left + chartWidth / 2}
                y={padding.top + chartHeight + 20}
                fontSize="10"
                fill="#666"
                textAnchor="middle"
              >
                {getDateLabel(data[Math.floor(data.length / 2)].date)}
              </SvgText>
            )}
            {data.length > 1 && (
              <SvgText
                x={padding.left + chartWidth}
                y={padding.top + chartHeight + 20}
                fontSize="10"
                fill="#666"
                textAnchor="middle"
              >
                {getDateLabel(data[data.length - 1].date)}
              </SvgText>
            )}
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});
