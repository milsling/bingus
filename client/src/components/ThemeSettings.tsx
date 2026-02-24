import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTheme } from "@/contexts/ThemeContext";
import { defaultThemeSettings } from "@/contexts/ThemeContext";
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Palette, Image, Trash2, Download } from 'lucide-react';
import ThemePresetSelector from './ThemePresetSelector';

export default function ThemeSettings() {
  const { settings, updateSettings, addCustomBackground, removeCustomBackground, canCustomize } = useTheme();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!canCustomize) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">You don't have permission to customize themes.</p>
        </CardContent>
      </Card>
    );
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, GIF)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', file);

      // Upload to server
      const response = await fetch('/api/upload/background', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      // Add to theme settings
      addCustomBackground({
        url: result.url,
        name: file.name,
      });

      toast({
        title: "Background uploaded",
        description: "Your custom background has been added successfully",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload background image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveBackground = (id: string, url: string) => {
    // Also remove from server
    fetch(`/api/upload/background?url=${encodeURIComponent(url)}`, {
      method: 'DELETE',
    }).catch(() => {
      // Continue even if server deletion fails
    });

    removeCustomBackground(id);
    toast({
      title: "Background removed",
      description: "The custom background has been removed",
    });
  };

  const presetBackgrounds = [
    { id: 'default', name: 'Default', type: 'default', value: '' },
    { id: 'gradient1', name: 'Ocean Blue', type: 'gradient', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 'gradient2', name: 'Sunset', type: 'gradient', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { id: 'gradient3', name: 'Forest', type: 'gradient', value: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)' },
    { id: 'gradient4', name: 'Galaxy', type: 'gradient', value: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme Customization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tints" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="presets">Presets</TabsTrigger>
              <TabsTrigger value="tints">Color Tints</TabsTrigger>
              <TabsTrigger value="backgrounds">Backgrounds</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
            </TabsList>

            <TabsContent value="presets" className="mt-0">
              <ThemePresetSelector />
            </TabsContent>

            <TabsContent value="tints" className="space-y-6">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="window-tint">Window Tint</Label>
                  <Input
                    id="window-tint"
                    type="color"
                    value={settings.windowTint}
                    onChange={(e) => updateSettings({ windowTint: e.target.value })}
                    className="w-full h-10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Applied to modal windows and dialogs
                  </p>
                </div>

                <div>
                  <Label htmlFor="panel-tint">Panel Tint</Label>
                  <Input
                    id="panel-tint"
                    type="color"
                    value={settings.panelTint}
                    onChange={(e) => updateSettings({ panelTint: e.target.value })}
                    className="w-full h-10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Applied to side panels and content areas
                  </p>
                </div>

                <div>
                  <Label htmlFor="bar-card-tint">Bar Card Tint</Label>
                  <Input
                    id="bar-card-tint"
                    type="color"
                    value={settings.barCardTint}
                    onChange={(e) => updateSettings({ barCardTint: e.target.value })}
                    className="w-full h-10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Applied to bar cards and list items
                  </p>
                </div>

                <div>
                  <Label>Bar Card Opacity: {Math.round(settings.barCardOpacity * 100)}%</Label>
                  <Slider
                    value={[settings.barCardOpacity * 100]}
                    onValueChange={([value]) => updateSettings({ barCardOpacity: value / 100 })}
                    max={100}
                    min={0}
                    step={1}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Transparency of bar cards and list items
                  </p>
                </div>

                <div>
                  <Label>Mobile Navigation Opacity: {Math.round(settings.mobileNavOpacity * 100)}%</Label>
                  <Slider
                    value={[settings.mobileNavOpacity * 100]}
                    onValueChange={([value]) => updateSettings({ mobileNavOpacity: value / 100 })}
                    max={100}
                    min={0}
                    step={1}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Transparency of mobile navigation panel and buttons
                  </p>
                </div>

                <div>
                  <Label htmlFor="top-bar-tint">Top Bar Tint</Label>
                  <Input
                    id="top-bar-tint"
                    type="color"
                    value={settings.topBarTint}
                    onChange={(e) => updateSettings({ topBarTint: e.target.value })}
                    className="w-full h-10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Applied to navigation bars and headers
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="backgrounds" className="space-y-6">
              <div>
                <Label>Preset Backgrounds</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {presetBackgrounds.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => updateSettings({ 
                        backgroundType: bg.type as any, 
                        backgroundValue: bg.value 
                      })}
                      className={`relative h-20 rounded-lg border-2 transition-all ${
                        settings.backgroundType === bg.type && settings.backgroundValue === bg.value
                          ? 'border-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                      style={{
                        background: bg.type === 'gradient' ? bg.value : undefined,
                        backgroundColor: bg.type === 'default' ? 'hsl(var(--background))' : undefined,
                      }}
                    >
                      <span className="absolute bottom-1 left-1 text-xs bg-background/80 px-1 rounded">
                        {bg.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>Custom Backgrounds</Label>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    size="sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload Image'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {settings.customBackgrounds.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {settings.customBackgrounds.map((bg) => (
                      <div
                        key={bg.id}
                        className={`relative group h-20 rounded-lg border-2 transition-all cursor-pointer ${
                          settings.backgroundType === 'custom' && settings.backgroundValue === bg.url
                            ? 'border-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => updateSettings({ 
                          backgroundType: 'custom', 
                          backgroundValue: bg.url 
                        })}
                      >
                        <img
                          src={bg.url}
                          alt={bg.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                          <span className="text-xs bg-background/80 px-1 rounded truncate">
                            {bg.name}
                          </span>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveBackground(bg.id, bg.url);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm mt-2">
                    No custom backgrounds uploaded yet
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Glass Opacity: {Math.round(settings.glassOpacity * 100)}%</Label>
                  <Slider
                    value={[settings.glassOpacity * 100]}
                    onValueChange={([value]) => updateSettings({ glassOpacity: value / 100 })}
                    max={100}
                    min={0}
                    step={1}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Transparency of glass surfaces
                  </p>
                </div>

                <div>
                  <Label>Border Opacity: {Math.round(settings.borderOpacity * 100)}%</Label>
                  <Slider
                    value={[settings.borderOpacity * 100]}
                    onValueChange={([value]) => updateSettings({ borderOpacity: value / 100 })}
                    max={100}
                    min={0}
                    step={1}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Visibility of borders and separators
                  </p>
                </div>

                <div>
                  <Label>Border Radius: {settings.borderRadius}px</Label>
                  <Slider
                    value={[settings.borderRadius]}
                    onValueChange={([value]) => updateSettings({ borderRadius: value })}
                    max={24}
                    min={0}
                    step={1}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Roundness of corners and edges
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => updateSettings(defaultThemeSettings)}
            >
              Reset to Default
            </Button>
            <Button
              onClick={() => {
                // Export settings
                const dataStr = JSON.stringify(settings, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                const exportFileDefaultName = 'theme-settings.json';
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
