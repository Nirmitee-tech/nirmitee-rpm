import * as React from 'react';
import { cn } from '../../utils/cn';

export interface DataPoint {
  value: number;
  timestamp: Date;
  label?: string;
}

export interface VitalTrendChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: DataPoint[];
  title: string;
  unit: string;
  minValue?: number;
  maxValue?: number;
  normalRange?: { min: number; max: number };
  height?: number;
}

const VitalTrendChart = React.forwardRef<HTMLDivElement, VitalTrendChartProps>(
  (
    {
      className,
      data,
      title,
      unit,
      minValue,
      maxValue,
      normalRange,
      height = 200,
      ...props
    },
    ref
  ) => {
    if (!data || data.length === 0) {
      return (
        <div
          ref={ref}
          className={cn(
            'rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950',
            className
          )}
          {...props}
        >
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400" style={{ height }}>
            No data available
          </div>
        </div>
      );
    }

    const values = data.map((d) => d.value);
    const dataMin = minValue ?? Math.min(...values);
    const dataMax = maxValue ?? Math.max(...values);
    const range = dataMax - dataMin || 1;

    const width = 100;
    const padding = 10;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = data.map((point, index) => {
      const x = padding + (chartWidth / Math.max(data.length - 1, 1)) * index;
      const y = padding + chartHeight - ((point.value - dataMin) / range) * chartHeight;
      return { x, y, ...point };
    });

    const pathD = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    const areaD = `${pathD} L ${points[points.length - 1].x} ${padding + chartHeight} L ${points[0].x} ${padding + chartHeight} Z`;

    const isInNormalRange = (value: number) => {
      if (!normalRange) return true;
      return value >= normalRange.min && value <= normalRange.max;
    };

    const lastValue = data[data.length - 1];
    const isLastNormal = isInNormalRange(lastValue.value);

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950',
          className
        )}
        {...props}
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <div className="text-right">
            <div
              className={cn(
                'text-lg font-bold',
                isLastNormal
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {lastValue.value.toFixed(1)} {unit}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">current</div>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height }}
        >
          {/* Normal range background */}
          {normalRange && (
            <rect
              x={padding}
              y={padding + chartHeight - ((normalRange.max - dataMin) / range) * chartHeight}
              width={chartWidth}
              height={((normalRange.max - normalRange.min) / range) * chartHeight}
              fill="currentColor"
              className="text-green-100 dark:text-green-900/20"
            />
          )}

          {/* Area under the line */}
          <path d={areaD} fill="currentColor" className="text-brand/10" />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-brand"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="1"
              fill="currentColor"
              className={cn(
                isInNormalRange(point.value)
                  ? 'text-green-500'
                  : 'text-red-500'
              )}
            >
              <title>
                {point.value.toFixed(1)} {unit} - {point.timestamp.toLocaleDateString()}
              </title>
            </circle>
          ))}
        </svg>

        {/* Legend */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{data[0].timestamp.toLocaleDateString()}</span>
          <span>{data.length} readings</span>
          <span>{data[data.length - 1].timestamp.toLocaleDateString()}</span>
        </div>

        {normalRange && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Normal range: {normalRange.min} - {normalRange.max} {unit}
          </div>
        )}
      </div>
    );
  }
);
VitalTrendChart.displayName = 'VitalTrendChart';

export { VitalTrendChart };
