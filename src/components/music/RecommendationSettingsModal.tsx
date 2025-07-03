
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface RecommendationSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type RecommendationMethod = 'liked' | 'searched' | 'favorites' | 'everything';

const RecommendationSettingsModal = ({ open, onOpenChange }: RecommendationSettingsModalProps) => {
  const [method, setMethod] = useState<RecommendationMethod>('everything');
  const [customOptions, setCustomOptions] = useState({
    liked: true,
    searched: true,
    favorites: true
  });
  const { toast } = useToast();

  useEffect(() => {
    const savedMethod = localStorage.getItem('recommendationMethod') as RecommendationMethod;
    const savedOptions = localStorage.getItem('recommendationOptions');
    
    if (savedMethod) {
      setMethod(savedMethod);
    }
    if (savedOptions) {
      setCustomOptions(JSON.parse(savedOptions));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('recommendationMethod', method);
    localStorage.setItem('recommendationOptions', JSON.stringify(customOptions));
    
    toast({
      title: "Settings saved",
      description: "Recommendation preferences updated",
      variant: "success"
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Recommendation Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <Label className="text-base font-medium">Choose recommendation method:</Label>
            
            <RadioGroup value={method} onValueChange={(value) => setMethod(value as RecommendationMethod)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="liked" id="liked" />
                <Label htmlFor="liked">Based on liked songs only</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="searched" id="searched" />
                <Label htmlFor="searched">Based on search history only</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="favorites" id="favorites" />
                <Label htmlFor="favorites">Based on favorite artists only</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="everything" id="everything" />
                <Label htmlFor="everything">Based on everything</Label>
              </div>
            </RadioGroup>
          </div>

          {method === 'everything' && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
              <Label className="text-sm font-medium">Include:</Label>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="liked-check"
                    checked={customOptions.liked}
                    onCheckedChange={(checked) => 
                      setCustomOptions(prev => ({ ...prev, liked: checked as boolean }))
                    }
                  />
                  <Label htmlFor="liked-check" className="text-sm">Liked songs</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="searched-check"
                    checked={customOptions.searched}
                    onCheckedChange={(checked) => 
                      setCustomOptions(prev => ({ ...prev, searched: checked as boolean }))
                    }
                  />
                  <Label htmlFor="searched-check" className="text-sm">Search history</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="favorites-check"
                    checked={customOptions.favorites}
                    onCheckedChange={(checked) => 
                      setCustomOptions(prev => ({ ...prev, favorites: checked as boolean }))
                    }
                  />
                  <Label htmlFor="favorites-check" className="text-sm">Favorite artists</Label>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecommendationSettingsModal;
