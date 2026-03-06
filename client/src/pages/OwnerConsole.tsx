import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useBars } from "@/context/BarContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BackgroundUploader } from "@/components/BackgroundUploader";
import { BackgroundSelector, useBackground } from "@/components/BackgroundSelector";
import {
  ArrowLeft, Bot, Crown, Image, Lock, MessageSquare,
  Palette, Power, RefreshCw, Settings2, Shield, Trash2,
  Trophy, Wrench, Key, Radio
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export default function OwnerConsole() {
  const { currentUser } = useBars();
  const [, setLocation] = useLocation();

  // Redirect non-owners inside useEffect to avoid render-time state updates
  useEffect(() => {
    if (!currentUser) {
      setLocation("/auth");
    } else if (!currentUser.isOwner) {
      setLocation("/404");
    }
  }, [currentUser, setLocation]);

  if (!currentUser || !currentUser.isOwner) {
    return null;
  }

  return <OwnerConsoleContent />;
}

function OwnerConsoleContent() {
  const { currentUser } = useBars();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { selectedBackground } = useBackground();
  const hasCustomBackground = selectedBackground.image !== null;
  const cardCn = cn("glass-surface-strong border-foreground/15");
  const { settings, updateSettings, setCanCustomize } = useTheme();

  // Mark owner as able to customize
  useEffect(() => {
    if (typeof setCanCustomize === 'function') setCanCustomize(true);
  }, [setCanCustomize]);

  const [activeTab, setActiveTab] = useState("appearance");

  // Console state
  const [consoleQuery, setConsoleQuery] = useState("");
  const [consoleOutput, setConsoleOutput] = useState<any>(null);
  const [actionUsername, setActionUsername] = useState("");

  // MOTD state
  const [motdMessage, setMotdMessage] = useState("");
  const [motdIsActive, setMotdIsActive] = useState(true);

  // AI settings state
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiStrictness, setAiStrictness] = useState("medium");

  // OAuth link state
  const [oauthUsername, setOauthUsername] = useState("");
  const [oauthSupabaseId, setOauthSupabaseId] = useState("");

  // Glass opacity controls
  const [glassOpacity, setGlassOpacity] = useState(() => {
    const s = window.localStorage.getItem("owner-glass-opacity"); return s ? parseFloat(s) : 0.98;
  });
  const [glassOpacityDark, setGlassOpacityDark] = useState(() => {
    const s = window.localStorage.getItem("owner-glass-opacity-dark"); return s ? parseFloat(s) : 0.85;
  });
  const [glassOpacityCustom, setGlassOpacityCustom] = useState(() => {
    const s = window.localStorage.getItem("owner-glass-opacity-custom"); return s ? parseFloat(s) : 0.75;
  });
  const [borderOpacity, setBorderOpacity] = useState(() => {
    const s = window.localStorage.getItem("owner-border-opacity"); return s ? parseFloat(s) : 0.9;
  });
  const [borderOpacityDark, setBorderOpacityDark] = useState(() => {
    const s = window.localStorage.getItem("owner-border-opacity-dark"); return s ? parseFloat(s) : 0.12;
  });

  // Apply opacity to CSS variables in real time + sync to ThemeContext
  const applyOpacity = (key: string, val: number) => {
    const root = document.documentElement;
    const setters: Record<string, () => void> = {
      glassOpacity: () => {
        root.style.setProperty("--owner-glass-surface-bg", `rgba(252,251,248,${val})`);
        root.style.setProperty("--owner-glass-surface-bg-strong", `rgba(254,253,250,${Math.min(val + 0.01, 1)})`);
        window.localStorage.setItem("owner-glass-opacity", val.toString());
        setGlassOpacity(val);
        updateSettings({ glassOpacity: val });
      },
      glassOpacityDark: () => {
        root.style.setProperty("--owner-glass-surface-bg-dark", `rgba(18,18,24,${val})`);
        root.style.setProperty("--owner-glass-surface-bg-strong-dark", `rgba(20,20,28,${Math.min(val + 0.03, 1)})`);
        window.localStorage.setItem("owner-glass-opacity-dark", val.toString());
        setGlassOpacityDark(val);
      },
      glassOpacityCustom: () => {
        root.style.setProperty("--owner-glass-surface-bg-custom", `rgba(18,18,24,${val})`);
        window.localStorage.setItem("owner-glass-opacity-custom", val.toString());
        setGlassOpacityCustom(val);
      },
      borderOpacity: () => {
        root.style.setProperty("--owner-glass-surface-border", `rgba(229,231,235,${val})`);
        window.localStorage.setItem("owner-border-opacity", val.toString());
        setBorderOpacity(val);
        updateSettings({ borderOpacity: val });
      },
      borderOpacityDark: () => {
        root.style.setProperty("--owner-glass-surface-border-dark", `rgba(255,255,255,${val})`);
        window.localStorage.setItem("owner-border-opacity-dark", val.toString());
        setBorderOpacityDark(val);
      },
    };
    setters[key]?.();
  };

  // MOTD query
  const { data: motdMessages = [] } = useQuery({
    queryKey: ["admin", "message-of-the-day"],
    queryFn: async () => {
      const res = await fetch("/api/admin/message-of-the-day", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // AI settings query
  const { data: aiSettings } = useQuery({
    queryKey: ["admin", "ai-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/ai-settings", { credentials: "include" });
      if (!res.ok) return {};
      return res.json();
    },
  });

  // Protected bars query
  const { data: protectedBars = [] } = useQuery({
    queryKey: ["admin", "protected-bars"],
    queryFn: async () => {
      const res = await fetch("/api/admin/protected-bars", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // Site settings mutation
  const saveSiteSettingsMutation = useMutation({
    mutationFn: async (settings: { defaultBackground?: string; themeSettings?: any }) => {
      const res = await fetch("/api/backgrounds/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save site settings");
      return res.json();
    },
    onSuccess: () => toast({ title: "Site settings saved!" }),
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  // MOTD mutation
  const createMotdMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/message-of-the-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: motdMessage, isActive: motdIsActive }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "message-of-the-day"] });
      toast({ title: "Message of the day updated" });
      setMotdMessage("");
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  // Delete MOTD mutation
  const deleteMotdMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/message-of-the-day/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "message-of-the-day"] });
      toast({ title: "Message deleted" });
    },
  });

  // Reset bar sequence mutation
  const resetSequenceMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/reset-bar-sequence", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => toast({ title: "Sequence reset", description: data.message }),
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  // Link Supabase mutation
  const linkSupabaseMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/link-supabase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: oauthUsername, supabaseId: oauthSupabaseId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      return res.json();
    },
    onSuccess: (data) => { toast({ title: "Linked!", description: data.message }); setOauthUsername(""); setOauthSupabaseId(""); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  // Update AI settings mutation
  const updateAISettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const res = await fetch("/api/admin/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ai-settings"] });
      toast({ title: "AI settings updated" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const tabs = [
    { value: "appearance", label: "Appearance", icon: Palette },
    { value: "motd", label: "MOTD", icon: MessageSquare },
    { value: "ai", label: "AI Settings", icon: Bot },
    { value: "oauth", label: "OAuth", icon: Key },
    { value: "tools", label: "Tools", icon: Wrench },
  ];

  return (
    <div className="min-h-[100dvh] pt-14 pb-20 md:pb-4 md:pt-24 overflow-x-hidden">
      <main className="mx-auto w-full max-w-3xl px-3 sm:px-4 md:px-8">

        {/* Header */}
        <div className="mb-4 sm:mb-6 glass-surface-strong rounded-2xl sm:rounded-3xl border border-foreground/[0.1] p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-600/30 to-pink-600/20">
                <Power className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-display font-bold truncate">Owner Console</h1>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Site control — visible to you only</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => setLocation("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Mobile tabs */}
          <div className="mb-4 md:hidden -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-hide touch-pan-x">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "min-w-[90px] flex-shrink-0 rounded-xl sm:rounded-2xl border px-2.5 sm:px-3 py-2 sm:py-2.5 text-left transition-all active:scale-[0.98]",
                  activeTab === tab.value
                    ? "border-primary/45 bg-primary/15 shadow-[0_0_16px_rgba(168,85,247,0.2)]"
                    : "border-foreground/[0.1] bg-foreground/[0.04] hover:bg-foreground/[0.08]"
                )}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className={cn("flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg sm:rounded-xl", activeTab === tab.value ? "bg-primary/20" : "bg-foreground/[0.08]")}>
                    <tab.icon className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", activeTab === tab.value ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold truncate">{tab.label}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Desktop tabs */}
          <TabsList className="hidden md:grid w-full grid-cols-5 mb-6 rounded-2xl border border-foreground/[0.1] bg-foreground/[0.03] p-1">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs rounded-xl data-[state=active]:bg-primary/15">
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Appearance tab */}
          <TabsContent value="appearance" className="space-y-4">
            <Card className={cardCn}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Image className="h-4 w-4" /> Upload Background</CardTitle>
                <CardDescription>Add new backgrounds to the site</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <BackgroundUploader />
              </CardContent>
            </Card>

            <Card className={cardCn}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-4 w-4" /> Site Default Background</CardTitle>
                <CardDescription>Set the default background for all users</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <BackgroundSelector />
                <div className="flex justify-end">
                  <Button
                    onClick={() => saveSiteSettingsMutation.mutate({ defaultBackground: String(selectedBackground?.id || "default") })}
                    disabled={saveSiteSettingsMutation.isPending}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {saveSiteSettingsMutation.isPending ? "Saving..." : "💾 Set as Site Default"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className={cardCn}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4" /> Opacity Controls</CardTitle>
                <CardDescription>Fine-tune glass panel opacity — changes apply in real-time</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground/80">Light Mode</h4>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Glass Opacity: {(glassOpacity * 100).toFixed(0)}%</Label>
                    <input type="range" min="0.5" max="1.0" step="0.01" value={glassOpacity}
                      onChange={(e) => applyOpacity("glassOpacity", parseFloat(e.target.value))}
                      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Border Opacity: {(borderOpacity * 100).toFixed(0)}%</Label>
                    <input type="range" min="0.3" max="1.0" step="0.01" value={borderOpacity}
                      onChange={(e) => applyOpacity("borderOpacity", parseFloat(e.target.value))}
                      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground/80">Dark Mode</h4>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Glass Opacity: {(glassOpacityDark * 100).toFixed(0)}%</Label>
                    <input type="range" min="0.3" max="1.0" step="0.01" value={glassOpacityDark}
                      onChange={(e) => applyOpacity("glassOpacityDark", parseFloat(e.target.value))}
                      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Border Opacity: {(borderOpacityDark * 100).toFixed(0)}%</Label>
                    <input type="range" min="0.02" max="0.4" step="0.01" value={borderOpacityDark}
                      onChange={(e) => applyOpacity("borderOpacityDark", parseFloat(e.target.value))}
                      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground/80">Custom Background</h4>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Panel Opacity: {(glassOpacityCustom * 100).toFixed(0)}%</Label>
                    <input type="range" min="0.3" max="1.0" step="0.01" value={glassOpacityCustom}
                      onChange={(e) => applyOpacity("glassOpacityCustom", parseFloat(e.target.value))}
                      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer" />
                  </div>
                </div>
                <Button
                  onClick={() => saveSiteSettingsMutation.mutate({
                    themeSettings: {
                      ...settings,
                      glassOpacity, glassOpacityDark, glassOpacityCustom, borderOpacity, borderOpacityDark
                    }
                  })}
                  disabled={saveSiteSettingsMutation.isPending}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {saveSiteSettingsMutation.isPending ? "Saving..." : "🌐 Push Theme to All Users"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MOTD tab */}
          <TabsContent value="motd" className="space-y-4">
            <Card className={cardCn}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Message of the Day</CardTitle>
                <CardDescription>Set a site-wide announcement shown to all users</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="space-y-2">
                  <Label>New Message</Label>
                  <Textarea
                    value={motdMessage}
                    onChange={(e) => setMotdMessage(e.target.value)}
                    placeholder="Enter your message of the day..."
                    className="resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={motdIsActive} onCheckedChange={setMotdIsActive} />
                    <Label className="text-sm">Active immediately</Label>
                  </div>
                  <Button onClick={() => createMotdMutation.mutate()} disabled={!motdMessage.trim() || createMotdMutation.isPending}>
                    {createMotdMutation.isPending ? "Saving..." : "Post Message"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {motdMessages.length > 0 && (
              <Card className={cardCn}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Previous Messages</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {motdMessages.map((msg: any) => (
                    <div key={msg.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-secondary/20 border border-border/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{msg.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={msg.isActive ? "default" : "secondary"} className="text-[10px]">
                            {msg.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="shrink-0 h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteMotdMutation.mutate(msg.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* AI Settings tab */}
          <TabsContent value="ai" className="space-y-4">
            <Card className={cardCn}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4" /> AI Moderation Settings</CardTitle>
                <CardDescription>Control AI moderation behavior site-wide</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {aiSettings ? (
                  <>
                    <div className="flex items-center justify-between rounded-xl border border-border/70 p-3">
                      <div>
                        <p className="text-sm font-medium">AI Moderation Enabled</p>
                        <p className="text-xs text-muted-foreground">Auto-review bars before they post</p>
                      </div>
                      <Switch
                        checked={aiSettings.enabled ?? true}
                        onCheckedChange={(v) => updateAISettingsMutation.mutate({ ...aiSettings, enabled: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border/70 p-3">
                      <div>
                        <p className="text-sm font-medium">Plagiarism Detection</p>
                        <p className="text-xs text-muted-foreground">Flag similar existing bars</p>
                      </div>
                      <Switch
                        checked={aiSettings.plagiarismDetection ?? true}
                        onCheckedChange={(v) => updateAISettingsMutation.mutate({ ...aiSettings, plagiarismDetection: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border/70 p-3">
                      <div>
                        <p className="text-sm font-medium">Allow Human Review</p>
                        <p className="text-xs text-muted-foreground">Users can appeal AI rejections</p>
                      </div>
                      <Switch
                        checked={aiSettings.allowHumanReview ?? true}
                        onCheckedChange={(v) => updateAISettingsMutation.mutate({ ...aiSettings, allowHumanReview: v })}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading AI settings...</p>
                )}
              </CardContent>
            </Card>

            <Card className={cardCn}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> Protected Bars</CardTitle>
                <CardDescription>{protectedBars.length} bars are currently protected from duplication</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {protectedBars.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No protected bars yet.</p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {protectedBars.slice(0, 10).map((bar: any) => (
                      <div key={bar.id} className="text-xs p-2 rounded-lg bg-secondary/20 border border-border/20 truncate">
                        {bar.content || bar.proofBarId}
                      </div>
                    ))}
                    {protectedBars.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center pt-1">+{protectedBars.length - 10} more</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* OAuth tab */}
          <TabsContent value="oauth" className="space-y-4">
            <Card className={cardCn}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4" /> Link Supabase OAuth Identity</CardTitle>
                <CardDescription>Link a Supabase OAuth identity to an existing app user</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={oauthUsername} onChange={(e) => setOauthUsername(e.target.value)} placeholder="e.g. milsling" />
                </div>
                <div className="space-y-2">
                  <Label>Supabase Identity ID</Label>
                  <Input value={oauthSupabaseId} onChange={(e) => setOauthSupabaseId(e.target.value)} placeholder="UUID from Supabase auth.identities" />
                </div>
                <Button
                  onClick={() => linkSupabaseMutation.mutate()}
                  disabled={!oauthUsername.trim() || !oauthSupabaseId.trim() || linkSupabaseMutation.isPending}
                  className="w-full"
                >
                  {linkSupabaseMutation.isPending ? "Linking..." : "Link Identity"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tools tab */}
          <TabsContent value="tools" className="space-y-4">
            <Card className={cardCn}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Reset Bar Authentication Sequence</CardTitle>
                <CardDescription>Re-index bar proof sequences. This is idempotent and safe to run.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  onClick={() => resetSequenceMutation.mutate()}
                  disabled={resetSequenceMutation.isPending}
                  className="w-full"
                >
                  {resetSequenceMutation.isPending ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Running...</>
                  ) : (
                    <><RefreshCw className="h-4 w-4 mr-2" /> Run Reset</>
                  )}
                </Button>
                {resetSequenceMutation.isSuccess && (
                  <p className="text-xs text-green-500 mt-2 text-center">✓ Reset completed successfully</p>
                )}
              </CardContent>
            </Card>

            <Card className={cn(cardCn, "border-red-500/20")}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-red-400"><Wrench className="h-4 w-4" /> Danger Zone</CardTitle>
                <CardDescription>Destructive operations — use with care</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="rounded-xl border border-red-500/20 p-3 text-sm text-muted-foreground">
                  Additional destructive tools (delete all bars, etc.) are available in the{" "}
                  <button className="text-primary underline" onClick={() => setLocation("/admin")}>Admin Panel</button>.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
