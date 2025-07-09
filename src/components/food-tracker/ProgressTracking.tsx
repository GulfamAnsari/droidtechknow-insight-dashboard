
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ProgressTracking = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Progress Tracking</CardTitle>
          <CardDescription>Monitor your nutrition and fitness progress over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Progress tracking charts coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressTracking;
