import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, Lock, Palette, Settings2, Shield, UserCog, Volume2 } from "lucide-react";
import { useBars } from "@/context/BarContext";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import { playNotificationSound, notificationSoundLabels, messageSoundLabels } from "@/lib/notificationSounds";
import { BackgroundSelector } from "@/components/BackgroundSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const FAB_DEBUG_LAUNCHER_HIDDEN_KEY = "fab-debug-launcher-hidden";
const FAB_DEBUG_VISIBILITY_EVENT = "fab-debug-launcher-visibility-change";

export default function Settings() {
  const { currentUser } = useBars();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const canDebugControls = Boolean(currentUser?.isAdmin || currentUser?.isAdminPlus || currentUser?.isOwner);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [messagePrivacy, setMessagePrivacy] = useState(currentUser?.messagePrivacy || "friends_only");
  const [notificationSound, setNotificationSound] = useState(currentUser?.notificationSound || "chime");
  const [messageSound, setMessageSound] = useState(currentUser?.messageSound || "ding");
  const [hideFabDebugLauncher, setHideFabDebugLauncher] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(FAB_DEBUG_LAUNCHER_HIDDEN_KEY) === "1";
  });

  useEffect(() => {
    if (!currentUser) return;
    setMessagePrivacy(currentUser.messagePrivacy || "friends_only");
    setNotificationSound(currentUser.notificationSound || "chime");
    setMessageSound(currentUser.messageSound || "ding");
  }, [currentUser]);

  if (!currentUser) {
    setLocation("/auth");
    return null;
  }

  const changePasswordMutation = useMutation({
    mutationFn: () => api.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been updated.",
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
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast({ title: "Privacy updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Could not update privacy setting",
        variant: "destructive",
      });
    },
  });

  const updateSoundMutation = useMutation({
    mutationFn: (data: { notificationSound?: string; messageSound?: string }) => api.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast({ title: "Sound setting saved" });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Could not update sound setting",
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

  const setFabDebugLauncherHidden = (hidden: boolean) => {
    setHideFabDebugLauncher(hidden);
    window.localStorage.setItem(FAB_DEBUG_LAUNCHER_HIDDEN_KEY, hidden ? "1" : "0");
    window.dispatchEvent(new CustomEvent(FAB_DEBUG_VISIBILITY_EVENT));
    toast({
      title: hidden ? "FAB debug hidden" : "FAB debug visible",
      description: hidden
        ? "Launcher moved off-screen until you re-enable it."
        : "Launcher is visible again.",
    });
  };

  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pt-24 md:pb-6">
      <main className="mx-auto w-full max-w-3xl px-4 md:px-8">
        <div className="mb-5 flex items-center gap-3">
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-settings-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-display font-bold">Settings</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Native-style controls for account and app preferences.</p>
          </div>
        </div>

        <div className="glass-surface-strong rounded-3xl border border-white/[0.08] p-4 md:p-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-5 flex h-auto w-full items-stretch justify-start gap-2 overflow-x-auto rounded-2xl bg-white/[0.03] p-1">
              <TabsTrigger
                value="general"
                className="rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap data-[state=active]:bg-primary/15 data-[state=active]:text-foreground"
                data-testid="tab-settings-general"
              >
                General
              </TabsTrigger>
              <TabsTrigger
                value="privacy"
                className="rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap data-[state=active]:bg-primary/15 data-[state=active]:text-foreground"
                data-testid="tab-settings-privacy"
              >
                Privacy
              </TabsTrigger>
              <TabsTrigger
                value="sounds"
                className="rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap data-[state=active]:bg-primary/15 data-[state=active]:text-foreground"
                data-testid="tab-settings-sounds"
              >
                Sounds
              </TabsTrigger>
              <TabsTrigger
                value="appearance"
                className="rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap data-[state=active]:bg-primary/15 data-[state=active]:text-foreground"
                data-testid="tab-settings-appearance"
              >
                Appearance
              </TabsTrigger>
              {canDebugControls && (
                <TabsTrigger
                  value="developer"
                  className="rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap data-[state=active]:bg-primary/15 data-[state=active]:text-foreground"
                  data-testid="tab-settings-developer"
                >
                  Developer
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="general" className="mt-0 space-y-4">
              <Card className="border-border/70 bg-background/40">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserCog className="h-4 w-4 text-primary" />
                    Profile lives in Edit Profile
                  </CardTitle>
                  <CardDescription>
                    Username, avatar, banner, bio, and location are now grouped in one place.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Link href="/profile/edit">
                    <Button className="w-full" data-testid="button-open-edit-profile">
                      Open Edit Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-background/40">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lock className="h-4 w-4 text-primary" />
                    Security
                  </CardTitle>
                  <CardDescription>Update your account password.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="space-y-2">
                    <Label htmlFor="settings-current-password">Current Password</Label>
                    <Input
                      id="settings-current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      data-testid="input-settings-current-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-new-password">New Password</Label>
                    <Input
                      id="settings-new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      data-testid="input-settings-new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-confirm-password">Confirm New Password</Label>
                    <Input
                      id="settings-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      data-testid="input-settings-confirm-password"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                    data-testid="button-settings-change-password"
                  >
                    {changePasswordMutation.isPending ? "Updating..." : "Change Password"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy" className="mt-0 space-y-4">
              <Card className="border-border/70 bg-background/40">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-4 w-4 text-primary" />
                    Message Privacy
                  </CardTitle>
                  <CardDescription>Choose who can send direct messages.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <RadioGroup
                    value={messagePrivacy}
                    onValueChange={(value) => {
                      setMessagePrivacy(value);
                      updatePrivacyMutation.mutate(value);
                    }}
                    className="space-y-3"
                  >
                    <Label
                      htmlFor="settings-friends-only"
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 p-3",
                        messagePrivacy === "friends_only" && "border-primary/40 bg-primary/10",
                      )}
                    >
                      <RadioGroupItem value="friends_only" id="settings-friends-only" data-testid="radio-settings-friends-only" />
                      <span>
                        <span className="block font-medium">Friends only</span>
                        <span className="text-xs text-muted-foreground">Only accepted friends can message you.</span>
                      </span>
                    </Label>
                    <Label
                      htmlFor="settings-everyone"
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 p-3",
                        messagePrivacy === "everyone" && "border-primary/40 bg-primary/10",
                      )}
                    >
                      <RadioGroupItem value="everyone" id="settings-everyone" data-testid="radio-settings-everyone" />
                      <span>
                        <span className="block font-medium">Everyone</span>
                        <span className="text-xs text-muted-foreground">Any user can send you a message.</span>
                      </span>
                    </Label>
                  </RadioGroup>
                  {updatePrivacyMutation.isPending && (
                    <p className="mt-3 text-xs text-muted-foreground">Saving privacy setting…</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sounds" className="mt-0 space-y-4">
              <Card className="border-border/70 bg-background/40">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bell className="h-4 w-4 text-primary" />
                    Notification Sound
                  </CardTitle>
                  <CardDescription>Pick your global notification tone.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <Select
                      value={notificationSound}
                      onValueChange={(value) => {
                        setNotificationSound(value);
                        playNotificationSound(value as any);
                        updateSoundMutation.mutate({ notificationSound: value });
                      }}
                    >
                      <SelectTrigger className="w-full" data-testid="select-settings-notification-sound">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(notificationSoundLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => playNotificationSound(notificationSound as any)}
                      data-testid="button-settings-test-notification-sound"
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-background/40">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Volume2 className="h-4 w-4 text-primary" />
                    Message Sound
                  </CardTitle>
                  <CardDescription>Choose a separate sound for direct messages.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <Select
                      value={messageSound}
                      onValueChange={(value) => {
                        setMessageSound(value);
                        playNotificationSound(value as any);
                        updateSoundMutation.mutate({ messageSound: value });
                      }}
                    >
                      <SelectTrigger className="w-full" data-testid="select-settings-message-sound">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(messageSoundLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => playNotificationSound(messageSound as any)}
                      data-testid="button-settings-test-message-sound"
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {updateSoundMutation.isPending && (
                    <p className="mt-3 text-xs text-muted-foreground">Saving sound setting…</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="mt-0 space-y-4">
              <Card className="border-border/70 bg-background/40">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings2 className="h-4 w-4 text-primary" />
                    Theme
                  </CardTitle>
                  <CardDescription>Switch between light, dark, or system mode.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(theme === "light" && "border-primary/50 bg-primary/10")}
                      onClick={() => setTheme("light")}
                      data-testid="button-settings-theme-light"
                    >
                      Light
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(theme === "dark" && "border-primary/50 bg-primary/10")}
                      onClick={() => setTheme("dark")}
                      data-testid="button-settings-theme-dark"
                    >
                      Dark
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(theme === "system" && "border-primary/50 bg-primary/10")}
                      onClick={() => setTheme("system")}
                      data-testid="button-settings-theme-system"
                    >
                      System
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Active appearance: {resolvedTheme === "dark" ? "Dark" : "Light"}
                    {theme === "system" ? " (system)" : ""}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-background/40">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Palette className="h-4 w-4 text-primary" />
                    Background
                  </CardTitle>
                  <CardDescription>Give the app your own visual vibe.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <BackgroundSelector />
                </CardContent>
              </Card>
            </TabsContent>

            {canDebugControls && (
              <TabsContent value="developer" className="mt-0 space-y-4">
                <Card className="border-border/70 bg-background/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Shield className="h-4 w-4 text-primary" />
                      FAB Debug Launcher
                    </CardTitle>
                    <CardDescription>
                      Control whether the FAB debug launcher is visible on mobile.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between rounded-xl border border-border/70 p-3">
                      <div>
                        <p className="text-sm font-medium">Show FAB debug launcher</p>
                        <p className="text-xs text-muted-foreground">
                          Turn this off to keep the debug control completely off-screen.
                        </p>
                      </div>
                      <Switch
                        checked={!hideFabDebugLauncher}
                        onCheckedChange={(checked) => setFabDebugLauncherHidden(!checked)}
                        data-testid="switch-fab-debug-launcher"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  );
}
