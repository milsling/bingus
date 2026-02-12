import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type StudioSettings = {
  autosave: boolean;
  focusMode: boolean;
  fontSize: "sm" | "md" | "lg";
};

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: StudioSettings;
  onChange: (next: Partial<StudioSettings>) => void;
}

export default function SettingsModal({
  open,
  onOpenChange,
  settings,
  onChange,
}: SettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>OrphanStudio settings</DialogTitle>
          <DialogDescription>
            Tune your writing environment. Everything saves locally in this browser.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
            <div>
              <Label className="text-sm font-medium">Autosave</Label>
              <p className="text-xs text-muted-foreground">Save changes automatically.</p>
            </div>
            <Switch
              checked={settings.autosave}
              onCheckedChange={(checked) => onChange({ autosave: checked })}
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
            <div>
              <Label className="text-sm font-medium">Focus mode</Label>
              <p className="text-xs text-muted-foreground">
                Minimize visual noise while writing.
              </p>
            </div>
            <Switch
              checked={settings.focusMode}
              onCheckedChange={(checked) => onChange({ focusMode: checked })}
            />
          </div>

          <div className="space-y-2 rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
            <Label className="text-sm font-medium">Editor text size</Label>
            <Select
              value={settings.fontSize}
              onValueChange={(value) =>
                onChange({ fontSize: value as StudioSettings["fontSize"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">Compact</SelectItem>
                <SelectItem value="md">Balanced</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
