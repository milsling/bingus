import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, Command, Crown, Lock, Settings2, Shield, UserCog, Volume2 } from "lucide-react";
import { useBars } from "@/context/BarContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { playNotificationSound, notificationSoundLabels, messageSoundLabels } from "@/lib/notificationSounds";
import { BackgroundUploader } from "@/components/BackgroundUploader";
import { BackgroundSelector } from "@/components/BackgroundSelector";
import { useBackground } from "@/components/BackgroundSelector";
import ThemeSettings from "@/components/ThemeSettings";
import AccentColorPicker from "@/components/AccentColorPicker";
import { useFabShortcuts, SHORTCUT_OPTIONS } from "@/hooks/useFabShortcuts";
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
  const { selectedBackground, setBackground } = useBackground();
  const hasCustomBackground = selectedBackground.image !== null;

  const canDebugControls = Boolean(currentUser?.isAdmin || currentUser?.isAdminPlus || currentUser?.isOwner);
  const isProMember = Boolean(currentUser?.isOwner || currentUser?.membershipTier === "donor_plus");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [messagePrivacy, setMessagePrivacy] = useState(currentUser?.messagePrivacy || "friends_only");
  const [notificationSound, setNotificationSound] = useState(currentUser?.notificationSound || "chime");
  const [messageSound, setMessageSound] = useState(currentUser?.messageSound || "ding");
  const { leftTarget, rightTarget, setLeft, setRight } = useFabShortcuts();
  const [hideFabDebugLauncher, setHideFabDebugLauncher] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(FAB_DEBUG_LAUNCHER_HIDDEN_KEY) === "1";
  });

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

  const { data: billingStatus } = useQuery({
    queryKey: ["billing", "status"],
    queryFn: () => api.getBillingStatus(),
    enabled: Boolean(currentUser),
    staleTime: 60_000,
  });

  const syncBillingMutation = useMutation({
    mutationFn: () => api.syncBillingStatus(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "status"] });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: () => api.createCheckoutSession(),
    onSuccess: ({ url }: { url: string }) => {
      window.location.href = url;
    },
    onError: (error: any) => {
      toast({
        title: "Upgrade failed",
        description: error.message || "Could not open checkout",
        variant: "destructive",
      });
    },
  });

  const billingPortalMutation = useMutation({
    mutationFn: () => api.createBillingPortalSession(),
    onSuccess: ({ url }: { url: string }) => {
      window.location.href = url;
    },
    onError: (error: any) => {
      toast({
        title: "Billing portal unavailable",
        description: error.message || "Could not open billing portal",
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

  // Sync local state when currentUser loads/changes
  useEffect(() => {
    if (!currentUser) return;
    setMessagePrivacy(currentUser.messagePrivacy || "friends_only");
    setNotificationSound(currentUser.notificationSound || "chime");
    setMessageSound(currentUser.messageSound || "ding");
  }, [currentUser]);

  // Handle billing redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billingResult = params.get("billing");
    if (!billingResult) return;

    if (billingResult === "success") {
      syncBillingMutation.mutate();
      toast({ title: "Payment successful", description: "Welcome to Orphan Bars Pro." });
    } else if (billingResult === "cancelled") {
      toast({ title: "Checkout cancelled" });
    }

    params.delete("billing");
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect to auth if not logged in (inside useEffect to avoid render-time state updates)
  useEffect(() => {
    if (!currentUser) {
      setLocation("/auth");
    }
  }, [currentUser, setLocation]);

  if (!currentUser) {
    return null;
  }

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
    <div className="min-h-[100dvh] pt-14 pb-20 md:pt-24 md:pb-6 overflow-x-hidden">
      <main className="mx-auto w-full max-w-3xl px-3 sm:px-4 md:px-8">
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

        <div className="glass-surface-strong rounded-2xl sm:rounded-3xl border border-foreground/[0.08] p-3 sm:p-4 md:p-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-5 flex h-auto w-full items-stretch justify-start gap-1 sm:gap-1.5 overflow-x-auto rounded-2xl bg-foreground/[0.03] p-1 sm:p-1.5 scrollbar-hide touch-pan-x">
              <TabsTrigger
                value="general"
                className="rounded-xl px-2.5 sm:px-3 py-2.5 text-[11px] sm:text-xs font-semibold whitespace-nowrap data-[state=active]:bg-primary/15 data-[state=active]:text-foreground min-w-fit flex-shrink-0"
                data-testid="tab-settings-general"
              >
                General
              </TabsTrigger>
              <TabsTrigger
                value="privacy"
                className="rounded-xl px-2.5 sm:px-3 py-2.5 text-[11px] sm:text-xs font-semibold whitespace-nowrap data-[state=active]:bg-primary/15 data-[state=active]:text-foreground min-w-fit flex-shrink-0"
                data-testid="tab-settings-privacy"
              >
                Privacy
              </TabsTrigger>
              <TabsTrigger
                value="sounds"
                className="rounded-xl px-2.5 sm:px-3 py-2.5 text-[11px] sm:text-xs font-semibold whitespace-nowrap data-[state=active]:bg-primary/15 data-[state=active]:text-foreground min-w-fit flex-shrink-0"
                data-testid="tab-settings-sounds"
              >
                Sounds
              </TabsTrigger>
              <TabsTrigger
                value="appearance"
                className="rounded-xl px-2.5 sm:px-3 py-2.5 text-[11px] sm:text-xs font-semibold whitespace-nowrap data-[state=active]:bg-primary/15 data-[state=active]:text-foreground min-w-fit flex-shrink-0"
                data-testid="tab-settings-appearance"
              >
                Appearance
              </TabsTrigger>
              {canDebugControls && (
                <TabsTrigger
                  value="developer"
                  className="rounded-xl px-2.5 sm:px-3 py-2.5 text-[11px] sm:text-xs font-semibold whitespace-nowrap data-[state=active]:bg-primary/15 data-[state=active]:text-foreground min-w-fit flex-shrink-0"
                  data-testid="tab-settings-developer"
                >
                  Developer
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="general" className="mt-0 space-y-4">
              <Card className={"glass-surface-strong border-foreground/15"}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Crown className="h-4 w-4 text-primary" />
                    Orphan Bars Pro — $10/month
                  </CardTitle>
                  <CardDescription>
                    Unlock real-time Orphie voice assistant and upload your own custom backgrounds.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {billingStatus && (
                    <p className="text-xs text-muted-foreground">
                      Status: {billingStatus.isPro ? "Pro active" : "Free"}
                      {billingStatus.membershipExpiresAt
                        ? ` • Renews ${new Date(billingStatus.membershipExpiresAt).toLocaleDateString()}`
                        : ""}
                    </p>
                  )}

                  {billingStatus && !billingStatus.stripeConfigured && (
                    <p className="text-xs text-amber-500">
                      Billing is not configured yet. Add Stripe environment variables on the server.
                    </p>
                  )}

                  <div className="flex gap-2">
                    {isProMember ? (
                      <Button
                        className="w-full"
                        onClick={() => billingPortalMutation.mutate()}
                        disabled={billingPortalMutation.isPending || (billingStatus ? !billingStatus.stripeConfigured : false)}
                      >
                        {billingPortalMutation.isPending ? "Opening..." : "Manage Billing"}
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => checkoutMutation.mutate()}
                        disabled={checkoutMutation.isPending || (billingStatus ? !billingStatus.stripeConfigured : false)}
                      >
                        {checkoutMutation.isPending ? "Redirecting..." : "Upgrade to Pro"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={"glass-surface-strong border-foreground/15"}>
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

              <Card className={"glass-surface-strong border-foreground/15"}>
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
              <Card className={"glass-surface-strong border-foreground/15"}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Command className="h-4 w-4 text-primary" />
                    Nav Button Shortcuts
                  </CardTitle>
                  <CardDescription>
                    Customize what happens when you hold and swipe the navigation button.
                    Swipe up always opens "Drop a Bar".
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-2">
                    <Label>Swipe Left</Label>
                    <Select
                      value={leftTarget}
                      onValueChange={(v) => {
                        setLeft(v as any);
                        toast({ title: "Shortcut updated", description: `Swipe left → ${SHORTCUT_OPTIONS.find(o => o.value === v)?.label}` });
                      }}
                    >
                      <SelectTrigger data-testid="select-shortcut-left">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SHORTCUT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label} — {opt.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Swipe Right</Label>
                    <Select
                      value={rightTarget}
                      onValueChange={(v) => {
                        setRight(v as any);
                        toast({ title: "Shortcut updated", description: `Swipe right → ${SHORTCUT_OPTIONS.find(o => o.value === v)?.label}` });
                      }}
                    >
                      <SelectTrigger data-testid="select-shortcut-right">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SHORTCUT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label} — {opt.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Hold the ◎ button and slide left or right to trigger these shortcuts.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy" className="mt-0 space-y-4">
              <Card className={"glass-surface-strong border-foreground/15"}>
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
              <Card className={"glass-surface-strong border-foreground/15"}>
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

              <Card className={"glass-surface-strong border-foreground/15"}>
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
              <Card className={"glass-surface-strong border-foreground/15"}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    🎛️ Visual Mode
                  </CardTitle>
                  <CardDescription>
                    Balanced dark is now the default everywhere. Accent and background customizations stay available.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  Theme switching has been removed. Enjoy the unified balanced dark experience.
                </CardContent>
              </Card>

              <Card className={"glass-surface-strong border-foreground/15"}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    🎨 Accent Color
                  </CardTitle>
                  <CardDescription>
                    {isProMember
                      ? "Choose an accent color or let it match your background automatically."
                      : "Upgrade to PRO to customize your accent color."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <AccentColorPicker isProMember={isProMember} />
                </CardContent>
              </Card>

              <Card className={"glass-surface-strong border-foreground/15"}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    🎨 Background Selection
                  </CardTitle>
                  <CardDescription>
                    Choose your preferred background theme
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <BackgroundSelector />
                </CardContent>
              </Card>

              <Card className={"glass-surface-strong border-foreground/15"}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    🖼️ Upload Custom Background
                  </CardTitle>
                  <CardDescription>
                    Available with Orphan Bars Pro membership.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <BackgroundUploader />
                </CardContent>
              </Card>

              {currentUser?.isOwner && <ThemeSettings />}

            </TabsContent>

            {canDebugControls && (
              <TabsContent value="developer" className="mt-0 space-y-4">
                <Card className={"glass-surface-strong border-foreground/15"}>
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
