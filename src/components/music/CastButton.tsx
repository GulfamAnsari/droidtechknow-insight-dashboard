import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Cast, MonitorSmartphone, RefreshCw, StopCircle, Radio } from "lucide-react";
import { useCast } from "@/contexts/CastContext";
import { useAuth } from "@/contexts/AuthContext";

interface CastButtonProps {
  className?: string;
  size?: "sm" | "default" | "icon";
  compact?: boolean;
}

const CastButton = ({ className = "", size = "icon", compact = false }: CastButtonProps) => {
  const { user } = useAuth();
  const { devices, isCasting, castTargetId, startCast, stopCast, refreshDevices, isReceiver, controllerDeviceName } = useCast();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const activeTarget = devices.find((d) => d.device_id === castTargetId);

  const handleOpen = async (v: boolean) => {
    setOpen(v);
    if (v) await refreshDevices();
  };

  return (
    <>
      <Button
        size={size}
        variant="ghost"
        onClick={() => handleOpen(true)}
        className={`${className} ${isCasting || isReceiver ? "text-primary" : ""}`}
        title={isReceiver ? `Receiving from ${controllerDeviceName || "another device"}` : isCasting ? `Casting to ${activeTarget?.device_name || "device"}` : "Cast to another device"}
      >
        <Cast className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cast className="h-5 w-5" /> Cast music
            </DialogTitle>
            <DialogDescription>
              Play on another device signed in with the same account.
            </DialogDescription>
          </DialogHeader>

          {isReceiver && (
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary animate-pulse" />
              <div className="text-sm">
                <div className="font-medium">This device is receiving audio</div>
                <div className="text-xs text-muted-foreground">
                  Controlled by {controllerDeviceName || "another device"}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Available devices</span>
            <Button variant="ghost" size="sm" onClick={refreshDevices} className="h-7">
              <RefreshCw className="h-3 w-3 mr-1" /> Refresh
            </Button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {devices.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-6">
                No other devices online. Open this app on another device (signed in with the same account) to cast to it.
              </div>
            )}
            {devices.map((d) => {
              const isActive = castTargetId === d.device_id;
              return (
                <button
                  key={d.device_id}
                  onClick={async () => {
                    if (isActive) {
                      await stopCast();
                    } else {
                      await startCast(d.device_id);
                    }
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted transition ${
                    isActive ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <MonitorSmartphone className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.device_name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {isActive ? "Casting here — tap to stop" : "Tap to cast here"}
                    </div>
                  </div>
                  {isActive && <Radio className="h-4 w-4 text-primary animate-pulse" />}
                </button>
              );
            })}
          </div>

          {isCasting && (
            <Button variant="outline" onClick={async () => { await stopCast(); setOpen(false); }} className="w-full">
              <StopCircle className="h-4 w-4 mr-2" /> Stop casting
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CastButton;
