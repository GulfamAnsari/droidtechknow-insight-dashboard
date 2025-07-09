
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Timer, Play, Pause, Square } from 'lucide-react';

const FastingTimer = () => {
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const savedStart = localStorage.getItem('fastingStartTime');
    if (savedStart) {
      setStartTime(new Date(savedStart));
      setIsActive(true);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime.getTime());
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isActive, startTime]);

  const startFasting = () => {
    const now = new Date();
    setStartTime(now);
    setIsActive(true);
    localStorage.setItem('fastingStartTime', now.toISOString());
  };

  const stopFasting = () => {
    setIsActive(false);
    setStartTime(null);
    setElapsedTime(0);
    localStorage.removeItem('fastingStartTime');
  };

  const formatTime = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Intermittent Fasting Timer
          </CardTitle>
          <CardDescription>Track your fasting periods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-6">
            <div className="text-6xl font-bold text-primary">
              {formatTime(elapsedTime)}
            </div>
            
            {isActive && (
              <div className="text-muted-foreground">
                Started at {startTime?.toLocaleTimeString()}
              </div>
            )}
            
            <div className="flex justify-center gap-4">
              {!isActive ? (
                <Button onClick={startFasting} className="gap-2">
                  <Play className="h-4 w-4" />
                  Start Fasting
                </Button>
              ) : (
                <Button onClick={stopFasting} variant="destructive" className="gap-2">
                  <Square className="h-4 w-4" />
                  End Fast
                </Button>
              )}
            </div>
            
            {elapsedTime > 0 && (
              <div className="text-sm text-muted-foreground">
                {elapsedTime >= 16 * 60 * 60 * 1000 && '🎉 Great job! You\'ve reached 16 hours!'}
                {elapsedTime >= 12 * 60 * 60 * 1000 && elapsedTime < 16 * 60 * 60 * 1000 && '💪 Keep going! You\'re doing great!'}
                {elapsedTime < 12 * 60 * 60 * 1000 && '⏰ Just getting started...'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FastingTimer;
