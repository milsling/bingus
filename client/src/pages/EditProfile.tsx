import { useState, useRef, useCallback } from "react";
import Navigation from "@/components/Navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Camera, Loader2, Lock, MessageCircle, ImageIcon, ZoomIn, ZoomOut, Palette } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useBars } from "@/context/BarContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { BackgroundSelector, useBackground } from "@/components/BackgroundSelector";

export default function EditProfile() {
  const { currentUser } = useBars();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const { variant: bgVariant, setVariant: setBgVariant } = useBackground();

  const [bio, setBio] = useState(currentUser?.bio || "");
  const [location, setLocationField] = useState(currentUser?.location || "");
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || "");
  const [bannerUrl, setBannerUrl] = useState(currentUser?.bannerUrl || "");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [newUsername, setNewUsername] = useState(currentUser?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [messagePrivacy, setMessagePrivacy] = useState(currentUser?.messagePrivacy || "friends_only");
  
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const cropSize = Math.min(width, height, 300);
    const crop = centerCrop(
      makeAspectCrop({ unit: 'px', width: cropSize }, 1, width, height),
      width,
      height
    );
    setCrop(crop);
  }, []);

  const getCroppedImage = useCallback(async (): Promise<Blob | null> => {
    if (!imgRef.current || !crop) return null;
    
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    const outputSize = 400;
    canvas.width = outputSize;
    canvas.height = outputSize;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      outputSize,
      outputSize
    );
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    });
  }, [crop]);

  const handleCropComplete = async () => {
    const croppedBlob = await getCroppedImage();
    if (!croppedBlob) {
      toast({ title: "Crop failed", description: "Could not crop the image", variant: "destructive" });
      return;
    }
    
    setIsUploadingAvatar(true);
    setCropDialogOpen(false);
    
    try {
      const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      const { uploadURL, objectPath } = await api.requestUploadUrl({
        name: file.name,
        size: file.size,
        type: file.type,
      });

      await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      setAvatarUrl(objectPath);
      toast({ title: "Image uploaded!", description: "Click Save to update your profile." });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message || "Could not upload image", variant: "destructive" });
    } finally {
      setIsUploadingAvatar(false);
      setImageSrc(null);
    }
  };

  const canChangeUsername = () => {
    if (!currentUser?.usernameChangedAt) return true;
    const daysSinceChange = (Date.now() - new Date(currentUser.usernameChangedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceChange >= 15;
  };

  const getDaysUntilUsernameChange = () => {
    if (!currentUser?.usernameChangedAt) return 0;
    const daysSinceChange = (Date.now() - new Date(currentUser.usernameChangedAt).getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(15 - daysSinceChange));
  };

  if (!currentUser) {
    setLocation("/auth");
    return null;
  }

  const updateProfileMutation = useMutation({
    mutationFn: (data: { bio?: string; location?: string; avatarUrl?: string; bannerUrl?: string }) =>
      api.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['user', currentUser.username] });
      toast({
        title: "Profile updated!",
        description: "Your changes have been saved.",
      });
      setLocation("/profile");
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Could not update profile",
        variant: "destructive",
      });
    },
  });

  const changeUsernameMutation = useMutation({
    mutationFn: () => api.changeUsername(newUsername),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast({
        title: "Username changed!",
        description: "Your username has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Username change failed",
        description: error.message || "Could not change username",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => api.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast({
        title: "Password changed!",
        description: "Your password has been updated successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Password change failed",
        description: error.message || "Could not change password",
        variant: "destructive",
      });
    },
  });

  const updatePrivacyMutation = useMutation({
    mutationFn: (privacy: string) => api.updateProfile({ messagePrivacy: privacy }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast({
        title: "Privacy updated",
        description: "Your message privacy setting has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Could not update privacy setting",
        variant: "destructive",
      });
    },
  });

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation must match.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate();
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleBannerClick = () => {
    bannerInputRef.current?.click();
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingBanner(true);
    try {
      const { uploadURL, objectPath } = await api.requestUploadUrl({
        name: file.name,
        size: file.size,
        type: file.type,
      });

      await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      setBannerUrl(objectPath);
      toast({
        title: "Banner uploaded!",
        description: "Click Save to update your profile.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Could not upload banner",
        variant: "destructive",
      });
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 10MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCropDialogOpen(true);
      setZoom(1);
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    updateProfileMutation.mutate({
      bio: bio || undefined,
      location: location || undefined,
      avatarUrl: avatarUrl || undefined,
      bannerUrl: bannerUrl || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-4 md:pt-24">
      <Navigation />
      
      <main className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-display font-bold">Edit Profile</h1>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Banner Upload */}
            <div className="space-y-2">
              <Label>Profile Banner</Label>
              <div 
                className="relative w-full h-32 rounded-lg overflow-hidden bg-secondary/30 border border-dashed border-border cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={handleBannerClick}
                data-testid="button-upload-banner"
              >
                {bannerUrl ? (
                  <img 
                    src={bannerUrl} 
                    alt="Profile banner" 
                    className="w-full h-full object-cover"
                    data-testid="img-banner-preview"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mb-2" />
                    <span className="text-sm">Click to upload banner</span>
                  </div>
                )}
                {isUploadingBanner && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
              </div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBannerChange}
                data-testid="input-banner-file"
              />
              <p className="text-xs text-muted-foreground">Recommended: 1200x400 pixels, max 10MB</p>
            </div>

            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl">{currentUser.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary"
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                  data-testid="button-upload-avatar"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  data-testid="input-avatar-file"
                />
              </div>
              <p className="text-sm text-muted-foreground">Click the camera icon to upload a new photo</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="flex gap-2">
                <Input
                  id="username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  disabled={!canChangeUsername()}
                  className="bg-secondary/30 border-border/50 flex-1"
                  data-testid="input-username"
                  maxLength={20}
                />
                {canChangeUsername() && newUsername !== currentUser.username && (
                  <Button
                    onClick={() => changeUsernameMutation.mutate()}
                    disabled={changeUsernameMutation.isPending || newUsername.length < 3}
                    data-testid="button-change-username"
                  >
                    {changeUsernameMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                )}
              </div>
              {canChangeUsername() ? (
                <p className="text-xs text-muted-foreground">3-20 characters, letters, numbers, and underscores only</p>
              ) : (
                <p className="text-xs text-amber-500">You can change your username again in {getDaysUntilUsernameChange()} days</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the world about yourself..."
                className="min-h-[100px] bg-secondary/30 border-border/50 resize-none"
                maxLength={300}
                data-testid="input-bio"
              />
              <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocationField(e.target.value)}
                placeholder="Where you reppin' from?"
                className="bg-secondary/30 border-border/50"
                data-testid="input-location"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setLocation("/profile")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
                data-testid="button-save"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="bg-secondary/30 border-border/50"
                data-testid="input-current-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className="bg-secondary/30 border-border/50"
                data-testid="input-new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="bg-secondary/30 border-border/50"
                data-testid="input-confirm-password"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
              data-testid="button-change-password"
            >
              {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Message Privacy
            </CardTitle>
            <CardDescription>Control who can send you direct messages</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={messagePrivacy}
              onValueChange={(value) => {
                setMessagePrivacy(value);
                updatePrivacyMutation.mutate(value);
              }}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="friends_only" id="friends_only" data-testid="radio-friends-only" />
                <Label htmlFor="friends_only" className="cursor-pointer">
                  <span className="font-medium">Friends only</span>
                  <p className="text-sm text-muted-foreground">Only accepted friends can message you</p>
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="everyone" id="everyone" data-testid="radio-everyone" />
                <Label htmlFor="everyone" className="cursor-pointer">
                  <span className="font-medium">Everyone</span>
                  <p className="text-sm text-muted-foreground">Any user can send you a message</p>
                </Label>
              </div>
            </RadioGroup>
            {updatePrivacyMutation.isPending && (
              <p className="text-xs text-muted-foreground mt-2">Saving...</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize how Orphan Bars looks for you</CardDescription>
          </CardHeader>
          <CardContent>
            <BackgroundSelector variant={bgVariant} onSelect={setBgVariant} />
          </CardContent>
        </Card>
      </main>

      <Dialog open={cropDialogOpen} onOpenChange={(open) => {
        setCropDialogOpen(open);
        if (!open) setImageSrc(null);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop Profile Picture</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {imageSrc && (
              <div className="relative w-full max-h-[400px] overflow-hidden rounded-lg bg-black/20">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  aspect={1}
                  circularCrop
                  className="max-h-[400px]"
                >
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="Crop preview"
                    onLoad={onImageLoad}
                    style={{ 
                      maxHeight: '400px', 
                      width: 'auto',
                      transform: `scale(${zoom})`,
                      transformOrigin: 'center'
                    }}
                  />
                </ReactCrop>
              </div>
            )}
            <div className="flex items-center gap-4 w-full px-4">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setCropDialogOpen(false);
              setImageSrc(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleCropComplete} disabled={isUploadingAvatar}>
              {isUploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
