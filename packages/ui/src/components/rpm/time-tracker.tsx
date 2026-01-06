import * as React from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../button';
import { Play, Pause, StopCircle } from 'lucide-react';

export interface TimeTrackerProps extends React.HTMLAttributes<HTMLDivElement> {
  patientId: string;
  onTimeLogged: (seconds: number) => void;
  initialSeconds?: number;
}

const TimeTracker = React.forwardRef<HTMLDivElement, TimeTrackerProps>(
  ({ className, patientId, onTimeLogged, initialSeconds = 0, ...props }, ref) => {
    const [seconds, setSeconds] = React.useState(initialSeconds);
    const [isRunning, setIsRunning] = React.useState(false);
    const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

    React.useEffect(() => {
      if (isRunning) {
        intervalRef.current = setInterval(() => {
          setSeconds((prev) => prev + 1);
        }, 1000);
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, [isRunning]);

    const formatTime = (totalSeconds: number) => {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;

      const pad = (n: number) => (n < 10 ? '0' + n : n.toString());
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
    };

    const handleStart = () => {
      setIsRunning(true);
    };

    const handlePause = () => {
      setIsRunning(false);
    };

    const handleStop = () => {
      setIsRunning(false);
      onTimeLogged(seconds);
      setSeconds(0);
    };

    const handleReset = () => {
      setIsRunning(false);
      setSeconds(0);
    };

    const getMinutes = () => Math.floor(seconds / 60);

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950',
          className
        )}
        {...props}
      >
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-4xl font-bold font-mono text-gray-900 dark:text-gray-100">
              {formatTime(seconds)}
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {getMinutes()} minute{getMinutes() !== 1 ? 's' : ''} tracked
            </div>
          </div>

          <div className="flex justify-center gap-2">
            {!isRunning ? (
              <Button onClick={handleStart} variant="success" size="lg">
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
            ) : (
              <Button onClick={handlePause} variant="secondary" size="lg">
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}

            <Button onClick={handleStop} variant="danger" size="lg" disabled={seconds === 0}>
              <StopCircle className="h-4 w-4 mr-2" />
              Stop & Log
            </Button>
          </div>

          {seconds > 0 && !isRunning && (
            <div className="text-center">
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Reset
              </button>
            </div>
          )}

          {/* Billing threshold indicators */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">CPT 99470 (10 min)</span>
              <span
                className={cn(
                  'font-medium',
                  getMinutes() >= 10 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                )}
              >
                {getMinutes() >= 10 ? '✓' : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">CPT 99457 (20 min)</span>
              <span
                className={cn(
                  'font-medium',
                  getMinutes() >= 20 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                )}
              >
                {getMinutes() >= 20 ? '✓' : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">CPT 99458 (40 min)</span>
              <span
                className={cn(
                  'font-medium',
                  getMinutes() >= 40 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                )}
              >
                {getMinutes() >= 40 ? '✓' : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
TimeTracker.displayName = 'TimeTracker';

export { TimeTracker };
