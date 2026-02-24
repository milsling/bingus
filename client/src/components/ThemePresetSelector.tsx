import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { Save, Upload, Download, Trash2, Globe, Users, Palette, Plus, Edit2, Eye } from 'lucide-react';

interface ThemePresetSelectorProps {
  className?: string;
}

export default function ThemePresetSelector({ className }: ThemePresetSelectorProps) {
  const { 
    presets, 
    currentPresetId, 
    savePreset, 
    loadPreset, 
    deletePreset, 
    publishGlobalTheme, 
    unpublishGlobalTheme,
    canCustomize 
  } = useTheme();
  const { toast } = useToast();
  
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your theme preset",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const newPreset = await savePreset(presetName.trim(), presetDescription.trim());
      toast({
        title: "Preset saved",
        description: `"${newPreset.name}" has been saved successfully`,
      });
      setIsSaveDialogOpen(false);
      setPresetName('');
      setPresetDescription('');
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save theme preset",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadPreset = (presetId: string) => {
    loadPreset(presetId);
    const preset = presets.find(p => p.id === presetId);
    toast({
      title: "Preset loaded",
      description: `"${preset?.name}" has been applied`,
    });
  };

  const handleDeletePreset = async (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    try {
      await deletePreset(presetId);
      toast({
        title: "Preset deleted",
        description: `"${preset.name}" has been deleted`,
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete preset",
        variant: "destructive",
      });
    }
  };

  const handlePublishGlobal = async (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    try {
      await publishGlobalTheme(presetId);
      toast({
        title: "Theme published globally",
        description: `"${preset.name}" is now visible to all users`,
      });
    } catch (error) {
      toast({
        title: "Publish failed",
        description: error instanceof Error ? error.message : "Failed to publish theme globally",
        variant: "destructive",
      });
    }
  };

  const handleUnpublishGlobal = async (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    try {
      await unpublishGlobalTheme(presetId);
      toast({
        title: "Theme unpublished",
        description: `"${preset.name}" is no longer global`,
      });
    } catch (error) {
      toast({
        title: "Unpublish failed",
        description: error instanceof Error ? error.message : "Failed to unpublish theme",
        variant: "destructive",
      });
    }
  };

  const exportPreset = (preset: any) => {
    const dataStr = JSON.stringify(preset, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `${preset.name.replace(/\s+/g, '-').toLowerCase()}-theme.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const localPresets = presets.filter(p => !p.isGlobal);
  const globalPresets = presets.filter(p => p.isGlobal);

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme Presets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current preset indicator */}
          {currentPresetId && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Palette className="h-4 w-4" />
              <span className="text-sm">
                Currently using: <strong>{presets.find(p => p.id === currentPresetId)?.name}</strong>
              </span>
            </div>
          )}

          {/* Save current settings */}
          <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" disabled={!canCustomize}>
                <Save className="h-4 w-4 mr-2" />
                Save Current Theme
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Theme Preset</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="preset-name">Name</Label>
                  <Input
                    id="preset-name"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="My Awesome Theme"
                    maxLength={50}
                  />
                </div>
                <div>
                  <Label htmlFor="preset-description">Description (optional)</Label>
                  <Input
                    id="preset-description"
                    value={presetDescription}
                    onChange={(e) => setPresetDescription(e.target.value)}
                    placeholder="A beautiful theme with custom colors"
                    maxLength={200}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSavePreset} disabled={isSaving} className="flex-1">
                    {isSaving ? 'Saving...' : 'Save Preset'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Global Presets */}
          {globalPresets.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4" />
                <h3 className="text-sm font-medium">Global Themes</h3>
                <Badge variant="secondary">{globalPresets.length}</Badge>
              </div>
              <div className="space-y-2">
                {globalPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      currentPresetId === preset.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleLoadPreset(preset.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{preset.name}</div>
                          {preset.description && (
                            <div className="text-xs text-muted-foreground">{preset.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          Global
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            exportPreset(preset);
                          }}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Local Presets */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4" />
              <h3 className="text-sm font-medium">My Themes</h3>
              <Badge variant="outline">{localPresets.length}</Badge>
            </div>
            {localPresets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Palette className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No saved themes yet</p>
                <p className="text-xs">Create and save your first theme preset</p>
              </div>
            ) : (
              <div className="space-y-2">
                {localPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      currentPresetId === preset.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleLoadPreset(preset.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{preset.name}</div>
                          {preset.description && (
                            <div className="text-xs text-muted-foreground">{preset.description}</div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Created {new Date(preset.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            exportPreset(preset);
                          }}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        {canCustomize && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePublishGlobal(preset.id);
                            }}
                          >
                            <Upload className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePreset(preset.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
