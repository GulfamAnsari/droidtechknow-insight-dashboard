
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PhotoLogging = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Photo Logging</CardTitle>
          <CardDescription>Capture your meals and track progress visually</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="flex justify-center gap-4">
              <Button variant="outline" className="gap-2">
                <Camera className="h-4 w-4" />
                Take Photo
              </Button>
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload Photo
              </Button>
            </div>
            <p className="text-muted-foreground">Photo logging functionality coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PhotoLogging;
