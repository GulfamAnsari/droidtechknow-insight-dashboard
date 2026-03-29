
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/hooks/use-theme";
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Database,
  Download,
  Trash2,
  Moon,
  Sun
} from "lucide-react";
import { useMusicContext } from "@/contexts/MusicContext";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { offlineSongs, deleteAllOfflineSongs } = useMusicContext();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(true);
  const [autoDownload, setAutoDownload] = useState(false);
  const [userName, setUserName] = useState("User");

  const handleDeleteOfflineSongs = async () => {
    try {
      await deleteAllOfflineSongs();
      toast({
        title: "Success",
        description: "All offline songs have been deleted",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete offline songs",
        variant: "destructive"
      });
    }
  };

  const [storageSize, setStorageSize] = useState("0 MB");

  useEffect(() => {
    calculateStorageSize();
  }, [offlineSongs]);

  const calculateStorageSize = () => {
    const request = indexedDB.open("OfflineMusicDB", 1);
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("songs")) {
        setStorageSize("0 MB");
        return;
      }
      const transaction = db.transaction(["songs"], "readonly");
      const store = transaction.objectStore("songs");
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => {
        const data = getAllRequest.result || [];
        let totalBytes = 0;
        data.forEach((song: any) => {
          if (song.audioBlob) totalBytes += song.audioBlob.size || 0;
          if (song.imageBlob) totalBytes += song.imageBlob.size || 0;
        });
        const mb = totalBytes / (1024 * 1024);
        setStorageSize(mb > 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`);
      };
    };
    request.onerror = () => setStorageSize("0 MB");
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your app preferences and data</p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Display Name</Label>
              <Input
                id="username"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Choose between light and dark theme
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
                <Moon className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications for important updates
                </p>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
          </CardContent>
        </Card>

        {/* Music Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Music Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Download</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically download liked songs for offline listening
                </p>
              </div>
              <Switch
                checked={autoDownload}
                onCheckedChange={setAutoDownload}
              />
            </div>
          </CardContent>
        </Card>

        {/* Storage Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Storage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Offline Songs</Label>
                <p className="text-sm text-muted-foreground">
                  {offlineSongs.length} songs ({calculateStorageSize()})
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteOfflineSongs}
                disabled={offlineSongs.length === 0}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Your data is stored locally on your device. We don't collect or share your personal information.
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={() => {
            toast({
              title: "Settings saved",
              description: "Your preferences have been updated",
              variant: "success"
            });
          }}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
