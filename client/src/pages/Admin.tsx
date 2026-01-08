import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Shield, Users, FileText, Trash2, Crown, CheckCircle, XCircle, Ban, Flag, AlertTriangle, Eye, Wrench, Archive, RotateCcw, Trophy, Plus, Pencil, Power, Clock, Check, X } from "lucide-react";
import { useLocation } from "wouter";
import { useBars } from "@/context/BarContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { User, BarWithUser } from "@shared/schema";

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

export default function Admin() {
  const { currentUser, bars } = useBars();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [moderateBarId, setModerateBarId] = useState<string | null>(null);
  const [moderateReason, setModerateReason] = useState("");

  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => api.getAllUsers(),
    enabled: !!currentUser?.isAdmin,
  });

  const deleteBarMutation = useMutation({
    mutationFn: (barId: string) => api.adminDeleteBar(barId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bars'] });
      toast({ title: "Bar deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteAllBarsMutation = useMutation({
    mutationFn: () => api.adminDeleteAllBars(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bars'] });
      toast({ title: "All bars deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => api.adminDeleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['bars'] });
      toast({ title: "User deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => 
      api.adminToggleAdmin(userId, isAdmin),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({ title: user.isAdmin ? "Admin granted" : "Admin revoked" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleVerifiedMutation = useMutation({
    mutationFn: ({ userId, emailVerified }: { userId: string; emailVerified: boolean }) => 
      api.adminToggleVerified(userId, emailVerified),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({ title: user.emailVerified ? "Email verified" : "Email unverified" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const changeMembershipMutation = useMutation({
    mutationFn: ({ userId, membershipTier }: { userId: string; membershipTier: string }) => 
      api.adminChangeMembership(userId, membershipTier),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({ title: `Membership changed to ${user.membershipTier}` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const moderateBarMutation = useMutation({
    mutationFn: ({ barId, reason }: { barId: string; reason: string }) => 
      api.adminModerateBar(barId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bars'] });
      setModerateBarId(null);
      setModerateReason("");
      toast({ title: "Post removed and user notified" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const { data: reports = [], isLoading: isLoadingReports } = useQuery<any[]>({
    queryKey: ['admin', 'reports'],
    queryFn: async () => {
      const res = await fetch('/api/admin/reports', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch reports');
      return res.json();
    },
    enabled: !!currentUser?.isAdmin,
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update report');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      toast({ title: "Report updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const [newPhrase, setNewPhrase] = useState("");
  const [newPhraseThreshold, setNewPhraseThreshold] = useState(80);
  const [newPhraseSeverity, setNewPhraseSeverity] = useState<string>("flag");

  const { data: phrases = [], isLoading: isLoadingPhrases } = useQuery<any[]>({
    queryKey: ['admin', 'phrases'],
    queryFn: async () => {
      const res = await fetch('/api/admin/phrases', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch phrases');
      return res.json();
    },
    enabled: !!currentUser?.isAdmin,
  });

  const { data: pendingBars = [], isLoading: isLoadingPending } = useQuery<any[]>({
    queryKey: ['admin', 'moderation', 'pending'],
    queryFn: async () => {
      const res = await fetch('/api/admin/moderation/pending', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch pending bars');
      return res.json();
    },
    enabled: !!currentUser?.isAdmin,
  });

  const createPhraseMutation = useMutation({
    mutationFn: async (data: { phrase: string; severity: string; similarityThreshold: number }) => {
      const res = await fetch('/api/admin/phrases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create phrase');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'phrases'] });
      setNewPhrase("");
      setNewPhraseThreshold(80);
      toast({ title: "Phrase added" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePhraseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/phrases/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete phrase');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'phrases'] });
      toast({ title: "Phrase deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const approveModerationMutation = useMutation({
    mutationFn: async (barId: string) => {
      const res = await fetch(`/api/admin/moderation/${barId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to approve');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'moderation', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['bars'] });
      toast({ title: "Bar approved" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectModerationMutation = useMutation({
    mutationFn: async (barId: string) => {
      const res = await fetch(`/api/admin/moderation/${barId}/reject`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to reject');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'moderation', 'pending'] });
      toast({ title: "Bar rejected" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const [maintenanceMessage, setMaintenanceMessage] = useState("Heads up - server maintenance incoming. Save your work!");

  const { data: maintenanceStatus } = useQuery<{ isActive: boolean; message?: string }>({
    queryKey: ['/api/maintenance'],
    enabled: !!currentUser?.isAdmin,
  });

  const activateMaintenanceMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error('Failed to activate maintenance');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance'] });
      toast({ title: "Maintenance warning activated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const clearMaintenanceMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/maintenance', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to clear maintenance');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance'] });
      toast({ title: "Maintenance warning cleared" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Custom achievement state and queries (owner only)
  const [newAchievementName, setNewAchievementName] = useState("");
  const [newAchievementEmoji, setNewAchievementEmoji] = useState("");
  const [newAchievementDescription, setNewAchievementDescription] = useState("");
  const [newAchievementRarity, setNewAchievementRarity] = useState("common");
  const [newAchievementCondition, setNewAchievementCondition] = useState("bars_posted");
  const [newAchievementThreshold, setNewAchievementThreshold] = useState(1);
  const [editingAchievement, setEditingAchievement] = useState<any>(null);

  const { data: customAchievements = [], isLoading: isLoadingAchievements } = useQuery<any[]>({
    queryKey: ['admin', 'achievements', 'custom'],
    queryFn: async () => {
      const res = await fetch('/api/admin/achievements/custom', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch custom achievements');
      return res.json();
    },
    enabled: !!(currentUser?.isOwner || currentUser?.isAdminPlus),
  });

  // Pending achievements for approval (owner only)
  const { data: pendingAchievements = [], isLoading: isLoadingPendingAchievements } = useQuery<any[]>({
    queryKey: ['admin', 'achievements', 'pending'],
    queryFn: async () => {
      const res = await fetch('/api/admin/achievements/pending', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch pending achievements');
      return res.json();
    },
    enabled: !!currentUser?.isOwner,
  });

  const approveAchievementMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/achievements/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to approve achievement');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'achievements', 'custom'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'achievements', 'pending'] });
      toast({ title: "Achievement approved and now active" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectAchievementMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/achievements/${id}/reject`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to reject achievement');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'achievements', 'custom'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'achievements', 'pending'] });
      toast({ title: "Achievement rejected" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createAchievementMutation = useMutation({
    mutationFn: async (data: { name: string; emoji: string; description: string; rarity: string; conditionType: string; threshold: number }) => {
      const res = await fetch('/api/admin/achievements/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create achievement');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'achievements', 'custom'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'achievements', 'pending'] });
      setNewAchievementName("");
      setNewAchievementEmoji("");
      setNewAchievementDescription("");
      setNewAchievementRarity("common");
      setNewAchievementCondition("bars_posted");
      setNewAchievementThreshold(1);
      toast({ title: data.message || (currentUser?.isOwner ? "Achievement created" : "Submitted for approval") });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateAchievementMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const res = await fetch(`/api/admin/achievements/custom/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update achievement');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'achievements', 'custom'] });
      setEditingAchievement(null);
      toast({ title: "Achievement updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteAchievementMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/achievements/custom/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete achievement');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'achievements', 'custom'] });
      toast({ title: "Achievement deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Debug logs query and mutations (owner only)
  const [debugFilter, setDebugFilter] = useState<string>("all");
  const { data: debugLogs = [], isLoading: isLoadingDebugLogs, refetch: refetchDebugLogs } = useQuery<any[]>({
    queryKey: ['admin', 'debug-logs', debugFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' });
      if (debugFilter !== 'all') params.set('action', debugFilter);
      const res = await fetch(`/api/admin/debug-logs?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch debug logs');
      return res.json();
    },
    enabled: !!currentUser?.isOwner,
  });

  const clearDebugLogsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/debug-logs', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to clear debug logs');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'debug-logs'] });
      toast({ title: "Debug logs cleared" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const conditionOptions = [
    { value: "bars_posted", label: "Bars Posted", description: "Post X number of bars" },
    { value: "likes_received", label: "Total Likes Received", description: "Receive X total likes across all bars" },
    { value: "followers_count", label: "Followers Count", description: "Gain X followers" },
    { value: "following_count", label: "Following Count", description: "Follow X people" },
    { value: "single_bar_likes", label: "Single Bar Likes", description: "Get X likes on a single bar" },
    { value: "single_bar_comments", label: "Single Bar Comments", description: "Get X comments on a single bar" },
    { value: "single_bar_bookmarks", label: "Single Bar Bookmarks", description: "Get X bookmarks on a single bar" },
    { value: "comments_made", label: "Comments Made", description: "Make X comments on bars" },
    { value: "bars_adopted", label: "Bars Adopted", description: "Adopt X bars from the Orphanage" },
    { value: "controversial_bar", label: "Controversial Bar", description: "Have a bar with more dislikes than likes (threshold = min total reactions)" },
    { value: "night_owl", label: "Night Owl", description: "Post a bar between midnight and 5am (threshold ignored)" },
    { value: "early_bird", label: "Early Bird", description: "Post a bar between 5am and 8am (threshold ignored)" },
  ];

  const rarityColors: Record<string, string> = {
    common: "text-gray-400",
    uncommon: "text-green-400",
    rare: "text-blue-400",
    epic: "text-purple-400",
    legendary: "text-yellow-400",
  };

  const { data: deletedBars = [], isLoading: isLoadingArchive } = useQuery<any[]>({
    queryKey: ['admin', 'archive'],
    queryFn: async () => {
      const res = await fetch('/api/admin/archive', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch archive');
      return res.json();
    },
    enabled: !!currentUser?.isAdmin,
  });

  const restoreBarMutation = useMutation({
    mutationFn: async (barId: string) => {
      const res = await fetch(`/api/admin/archive/${barId}/restore`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to restore bar');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'archive'] });
      queryClient.invalidateQueries({ queryKey: ['bars'] });
      toast({ title: "Bar restored successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleModerate = () => {
    if (moderateBarId && moderateReason.trim()) {
      moderateBarMutation.mutate({ barId: moderateBarId, reason: moderateReason.trim() });
    }
  };

  if (!currentUser) {
    setLocation("/auth");
    return null;
  }

  if (!currentUser.isAdmin) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-0 md:pt-16">
      <Navigation />
      
      <main className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{allUsers.length}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{bars.length}</p>
                  <p className="text-sm text-muted-foreground">Total Bars</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Crown className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{allUsers.filter(u => u.isAdmin).length}</p>
                  <p className="text-sm text-muted-foreground">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="moderation" className="w-full">
          <TabsList className={`grid w-full mb-6 ${(currentUser?.isOwner || currentUser?.isAdminPlus) ? 'grid-cols-9' : 'grid-cols-7'}`}>
            <TabsTrigger value="moderation" className="gap-1 text-xs px-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Review</span>
              {pendingBars.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {pendingBars.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="phrases" className="gap-1 text-xs px-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Phrases</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1 text-xs px-2">
              <Flag className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
              {reports.filter((r: any) => r.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {reports.filter((r: any) => r.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-1 text-xs px-2">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Maint.</span>
              {maintenanceStatus?.isActive && (
                <Badge variant="default" className="ml-1 text-xs bg-orange-500">
                  ON
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archive" className="gap-1 text-xs px-2">
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">Archive</span>
              {deletedBars.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {deletedBars.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1 text-xs px-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="bars" className="gap-1 text-xs px-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Bars</span>
            </TabsTrigger>
            {(currentUser?.isOwner || currentUser?.isAdminPlus) && (
              <TabsTrigger value="achievements" className="gap-1 text-xs px-2">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Badges</span>
              </TabsTrigger>
            )}
            {(currentUser?.isOwner || currentUser?.isAdminPlus) && (
              <TabsTrigger value="debug" className="gap-1 text-xs px-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Logs</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="moderation">
            <Card className="border-border bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-500" />
                  Pending Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPending ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : pendingBars.length === 0 ? (
                  <p className="text-muted-foreground">No bars pending review.</p>
                ) : (
                  <div className="space-y-4">
                    {pendingBars.map((bar: any) => (
                      <div key={bar.id} className="border border-border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              Posted by <span className="font-medium text-foreground">@{bar.user?.username}</span>
                            </p>
                            {bar.matchedPhrase && (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-orange-500 border-orange-500">
                                  {bar.moderationScore}% match
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  Matched: "{bar.matchedPhrase.phrase}"
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-500 border-green-500"
                              onClick={() => approveModerationMutation.mutate(bar.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectModerationMutation.mutate(bar.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Block
                            </Button>
                          </div>
                        </div>
                        <div className="border-l-2 border-primary/50 pl-3 py-1 bg-secondary/20 rounded">
                          <p className="text-sm">{stripHtml(bar.content)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="phrases">
            <Card className="border-border bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Flagged Phrases
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Add phrases that should be flagged for review. Similar content (based on threshold %) will be held for your approval.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPhrase}
                      onChange={(e) => setNewPhrase(e.target.value)}
                      placeholder="Enter phrase to flag..."
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                    />
                    <Select value={newPhraseSeverity} onValueChange={setNewPhraseSeverity}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flag">Flag</SelectItem>
                        <SelectItem value="block">Block</SelectItem>
                      </SelectContent>
                    </Select>
                    <input
                      type="number"
                      value={newPhraseThreshold}
                      onChange={(e) => setNewPhraseThreshold(parseInt(e.target.value) || 80)}
                      className="w-16 px-2 py-2 bg-background border border-border rounded-md text-sm text-center"
                      min={50}
                      max={100}
                    />
                    <span className="text-sm text-muted-foreground self-center">%</span>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (newPhrase.trim()) {
                          createPhraseMutation.mutate({
                            phrase: newPhrase.trim(),
                            severity: newPhraseSeverity,
                            similarityThreshold: newPhraseThreshold,
                          });
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {isLoadingPhrases ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : phrases.length === 0 ? (
                  <p className="text-muted-foreground">No flagged phrases yet. Add one above.</p>
                ) : (
                  <div className="space-y-2">
                    {phrases.map((phrase: any) => (
                      <div key={phrase.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <Badge variant={phrase.severity === 'block' ? 'destructive' : 'secondary'}>
                            {phrase.severity}
                          </Badge>
                          <span className="font-mono text-sm">"{phrase.phrase}"</span>
                          <span className="text-xs text-muted-foreground">
                            {phrase.similarityThreshold}% threshold
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deletePhraseMutation.mutate(phrase.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="border-border bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Content Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingReports ? (
                  <p className="text-muted-foreground">Loading reports...</p>
                ) : reports.length === 0 ? (
                  <p className="text-muted-foreground">No reports yet.</p>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report: any) => (
                      <div key={report.id} className="border border-border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={report.status === 'pending' ? 'destructive' : report.status === 'action_taken' ? 'default' : 'secondary'}>
                                {report.status}
                              </Badge>
                              <Badge variant="outline">{report.reason.replace('_', ' ')}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Reported by <span className="font-medium text-foreground">@{report.reporter?.username}</span>
                              {' · '}
                              {new Date(report.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {report.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateReportMutation.mutate({ reportId: report.id, status: 'dismissed' })}
                              >
                                Dismiss
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (report.barId) {
                                    setModerateBarId(report.barId);
                                    setModerateReason(`Removed due to user report: ${report.reason}`);
                                  }
                                  updateReportMutation.mutate({ reportId: report.id, status: 'action_taken' });
                                }}
                              >
                                Take Action
                              </Button>
                            </div>
                          )}
                        </div>
                        {report.details && (
                          <p className="text-sm bg-secondary/30 p-2 rounded">
                            <span className="font-medium">Details:</span> {report.details}
                          </p>
                        )}
                        {report.bar && (
                          <div className="border-l-2 border-primary/50 pl-3 py-1">
                            <p className="text-sm text-muted-foreground mb-1">Reported content:</p>
                            <p className="text-sm">{stripHtml(report.bar.content)}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance">
            <Card className="border-border bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-orange-500" />
                  Maintenance Warning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-secondary/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Current Status</h4>
                      <p className="text-sm text-muted-foreground">
                        {maintenanceStatus?.isActive 
                          ? "Warning banner is currently active" 
                          : "No active maintenance warning"}
                      </p>
                    </div>
                    <Badge className={maintenanceStatus?.isActive ? "bg-orange-500" : "bg-green-500"}>
                      {maintenanceStatus?.isActive ? "Active" : "Clear"}
                    </Badge>
                  </div>
                  
                  {maintenanceStatus?.isActive && maintenanceStatus.message && (
                    <div className="p-3 rounded bg-orange-500/20 border border-orange-500/30">
                      <p className="text-sm font-medium text-orange-400">Current message:</p>
                      <p className="text-sm">{maintenanceStatus.message}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-message">Warning Message</Label>
                    <Textarea
                      id="maintenance-message"
                      placeholder="Heads up - server maintenance incoming. Save your work!"
                      value={maintenanceMessage}
                      onChange={(e) => setMaintenanceMessage(e.target.value)}
                      className="min-h-[80px]"
                      data-testid="input-maintenance-message"
                    />
                    <p className="text-xs text-muted-foreground">
                      This message will scroll across the top of every page.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => activateMaintenanceMutation.mutate(maintenanceMessage)}
                      disabled={!maintenanceMessage.trim() || activateMaintenanceMutation.isPending}
                      className="bg-orange-500 hover:bg-orange-600"
                      data-testid="button-activate-maintenance"
                    >
                      {activateMaintenanceMutation.isPending ? "Activating..." : "Activate Warning"}
                    </Button>
                    {maintenanceStatus?.isActive && (
                      <Button
                        variant="outline"
                        onClick={() => clearMaintenanceMutation.mutate()}
                        disabled={clearMaintenanceMutation.isPending}
                        data-testid="button-clear-maintenance"
                      >
                        {clearMaintenanceMutation.isPending ? "Clearing..." : "Clear Warning"}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <h4 className="font-medium text-sm">Preview</h4>
                  <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-black p-2 rounded text-sm font-bold overflow-hidden">
                    <div className="whitespace-nowrap">
                      ⚠️ {maintenanceMessage || "Heads up - server maintenance incoming. Save your work!"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="archive">
            <Card className="border-border bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-purple-500" />
                  Deleted Bars Archive
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingArchive ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : deletedBars.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Archive className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No deleted bars in archive.</p>
                    <p className="text-sm">Deleted bars are preserved here for audit purposes.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deletedBars.map((bar: any) => (
                      <div key={bar.id} className="border border-border rounded-lg p-4 space-y-3 bg-secondary/20">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={bar.user?.avatarUrl || undefined} />
                                <AvatarFallback>{bar.user?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">@{bar.user?.username || 'Unknown'}</span>
                              {bar.proofBarId && (
                                <Badge variant="outline" className="text-xs font-mono">
                                  {bar.proofBarId}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Deleted {bar.deletedAt ? new Date(bar.deletedAt).toLocaleDateString() : 'Unknown date'}
                              {bar.deletedReason && (
                                <span className="text-orange-400"> • Reason: {bar.deletedReason}</span>
                              )}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-500 border-green-500 hover:bg-green-500/20"
                            onClick={() => restoreBarMutation.mutate(bar.id)}
                            disabled={restoreBarMutation.isPending}
                            data-testid={`button-restore-bar-${bar.id}`}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                        </div>
                        <div className="border-l-2 border-muted pl-3 py-2">
                          <p className="text-sm whitespace-pre-wrap">{stripHtml(bar.content)}</p>
                        </div>
                        {bar.explanation && (
                          <p className="text-xs text-muted-foreground italic">
                            Explanation: {bar.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="border-border bg-card/50">
              <CardHeader>
                <CardTitle>All Users</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : (
                  <div className="space-y-4">
                    {allUsers.map((user) => (
                      <div
                        key={user.id}
                        className="p-4 rounded-lg bg-secondary/30 space-y-3"
                        data-testid={`admin-user-${user.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatarUrl || undefined} />
                              <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{user.username}</span>
                                {user.isAdmin && <Badge variant="secondary">{user.username === "Milsling" ? "Owner" : "Admin"}</Badge>}
                                {user.emailVerified ? (
                                  <Badge className="bg-green-500/20 text-green-500 gap-1">
                                    <CheckCircle className="h-3 w-3" /> Verified
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-500/20 text-red-500 gap-1">
                                    <XCircle className="h-3 w-3" /> Unverified
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{user.email || "No email"}</p>
                            </div>
                          </div>
                          {user.id !== currentUser.id && !user.isOwner && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" data-testid={`button-delete-user-${user.id}`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete @{user.username}? This will also delete all their bars. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteUserMutation.mutate(user.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                        
                        {user.id !== currentUser.id && !user.isOwner && (
                          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/50">
                            {currentUser.isOwner && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Admin</span>
                                <Switch
                                  checked={user.isAdmin}
                                  onCheckedChange={(checked) => 
                                    toggleAdminMutation.mutate({ userId: user.id, isAdmin: checked })
                                  }
                                  disabled={toggleAdminMutation.isPending}
                                  data-testid={`switch-admin-${user.id}`}
                                />
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Verified</span>
                              <Switch
                                checked={user.emailVerified}
                                onCheckedChange={(checked) => 
                                  toggleVerifiedMutation.mutate({ userId: user.id, emailVerified: checked })
                                }
                                disabled={toggleVerifiedMutation.isPending}
                                data-testid={`switch-verified-${user.id}`}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Tier</span>
                              <Select
                                value={user.membershipTier}
                                onValueChange={(value) => 
                                  changeMembershipMutation.mutate({ userId: user.id, membershipTier: value })
                                }
                                disabled={changeMembershipMutation.isPending}
                              >
                                <SelectTrigger className="h-7 w-24 text-xs" data-testid={`select-tier-${user.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">Free</SelectItem>
                                  <SelectItem value="basic">Basic</SelectItem>
                                  <SelectItem value="premium">Premium</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bars">
            <Card className="border-border bg-card/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>All Bars</CardTitle>
                {bars.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" data-testid="button-delete-all-bars">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All Bars
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete All Bars</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete ALL {bars.length} bars? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteAllBarsMutation.mutate()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bars.map((bar) => (
                    <div
                      key={bar.id}
                      className="flex items-start justify-between p-3 rounded-lg bg-secondary/30"
                      data-testid={`admin-bar-${bar.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">@{bar.user?.username || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{stripHtml(bar.content)}</p>
                        <Badge variant="outline" className="mt-2 text-xs">{bar.category}</Badge>
                      </div>
                      {!bar.user?.isOwner && (
                        <div className="flex items-center gap-1 ml-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-orange-500 hover:bg-orange-500/10"
                            onClick={() => {
                              setModerateBarId(bar.id);
                              setModerateReason("");
                            }}
                            data-testid={`button-moderate-bar-${bar.id}`}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" data-testid={`button-delete-bar-${bar.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Bar</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this bar? This action cannot be undone. The user will NOT be notified.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteBarMutation.mutate(bar.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  ))}
                  {bars.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">No bars yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {(currentUser?.isOwner || currentUser?.isAdminPlus) && (
            <TabsContent value="achievements">
              <Card className="border-border bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    {currentUser?.isOwner ? "Custom Achievements" : "Submit Achievement Ideas"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="border border-border rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create New Achievement
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="achievement-name">Name</Label>
                        <Input
                          id="achievement-name"
                          placeholder="e.g., Comment King"
                          value={newAchievementName}
                          onChange={(e) => setNewAchievementName(e.target.value)}
                          data-testid="input-achievement-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="achievement-emoji">Emoji</Label>
                        <Input
                          id="achievement-emoji"
                          placeholder="e.g., 👑"
                          value={newAchievementEmoji}
                          onChange={(e) => setNewAchievementEmoji(e.target.value)}
                          maxLength={4}
                          data-testid="input-achievement-emoji"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="achievement-description">Description</Label>
                      <Textarea
                        id="achievement-description"
                        placeholder="e.g., Make 100 comments on bars"
                        value={newAchievementDescription}
                        onChange={(e) => setNewAchievementDescription(e.target.value)}
                        data-testid="input-achievement-description"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="achievement-condition">Condition</Label>
                        <Select value={newAchievementCondition} onValueChange={setNewAchievementCondition}>
                          <SelectTrigger id="achievement-condition" data-testid="select-achievement-condition">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {conditionOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {conditionOptions.find(o => o.value === newAchievementCondition)?.description}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="achievement-threshold">Threshold</Label>
                        <Input
                          id="achievement-threshold"
                          type="number"
                          min={1}
                          value={newAchievementThreshold}
                          onChange={(e) => setNewAchievementThreshold(parseInt(e.target.value) || 1)}
                          data-testid="input-achievement-threshold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="achievement-rarity">Rarity</Label>
                        <Select value={newAchievementRarity} onValueChange={setNewAchievementRarity}>
                          <SelectTrigger id="achievement-rarity" data-testid="select-achievement-rarity">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="common">Common</SelectItem>
                            <SelectItem value="uncommon">Uncommon</SelectItem>
                            <SelectItem value="rare">Rare</SelectItem>
                            <SelectItem value="epic">Epic</SelectItem>
                            <SelectItem value="legendary">Legendary</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      onClick={() => createAchievementMutation.mutate({
                        name: newAchievementName,
                        emoji: newAchievementEmoji,
                        description: newAchievementDescription,
                        rarity: newAchievementRarity,
                        conditionType: newAchievementCondition,
                        threshold: newAchievementThreshold,
                      })}
                      disabled={!newAchievementName.trim() || !newAchievementEmoji.trim() || !newAchievementDescription.trim() || createAchievementMutation.isPending}
                      className="w-full"
                      data-testid="button-create-achievement"
                    >
                      {createAchievementMutation.isPending 
                        ? (currentUser?.isOwner ? "Creating..." : "Submitting...") 
                        : (currentUser?.isOwner ? "Create Achievement" : "Submit for Approval")}
                    </Button>
                    {!currentUser?.isOwner && (
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Your achievement will be reviewed by the site owner before going live.
                      </p>
                    )}
                  </div>

                  {!currentUser?.isOwner && currentUser?.isAdminPlus && (
                    <div className="border border-blue-500/30 bg-blue-500/10 rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold flex items-center gap-2 text-blue-400">
                        <Clock className="h-4 w-4" />
                        Your Pending Submissions
                      </h3>
                      {customAchievements.filter((a: any) => a.approvalStatus === 'pending').length === 0 ? (
                        <p className="text-muted-foreground text-sm">No pending submissions.</p>
                      ) : (
                        <div className="space-y-2">
                          {customAchievements.filter((a: any) => a.approvalStatus === 'pending').map((achievement: any) => (
                            <div
                              key={achievement.id}
                              className="flex items-center gap-3 border border-border rounded-lg p-3 bg-card"
                            >
                              <span className="text-2xl">{achievement.emoji}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{achievement.name}</span>
                                  <Badge variant="outline" className={rarityColors[achievement.rarity] || "text-gray-400"}>
                                    {achievement.rarity}
                                  </Badge>
                                  <Badge variant="outline" className="text-orange-400 border-orange-400">
                                    Awaiting Approval
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{achievement.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {currentUser?.isOwner && pendingAchievements.length > 0 && (
                    <div className="border border-orange-500/50 bg-orange-500/10 rounded-lg p-4 space-y-4">
                      <h3 className="font-semibold flex items-center gap-2 text-orange-400">
                        <Clock className="h-4 w-4" />
                        Pending Approval ({pendingAchievements.length})
                      </h3>
                      <div className="space-y-2">
                        {pendingAchievements.map((achievement: any) => (
                          <div
                            key={achievement.id}
                            className="flex items-center justify-between border border-border rounded-lg p-3 bg-card"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{achievement.emoji}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{achievement.name}</span>
                                  <Badge variant="outline" className={rarityColors[achievement.rarity] || "text-gray-400"}>
                                    {achievement.rarity}
                                  </Badge>
                                  <Badge variant="outline" className="text-orange-400 border-orange-400">
                                    Pending
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{achievement.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {conditionOptions.find(o => o.value === achievement.conditionType)?.label} ({achievement.threshold})
                                  {achievement.createdBy && ` • Submitted by Admin+`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => approveAchievementMutation.mutate(achievement.id)}
                                className="text-green-500 hover:bg-green-500/10"
                                title="Approve"
                                data-testid={`button-approve-achievement-${achievement.id}`}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => rejectAchievementMutation.mutate(achievement.id)}
                                className="text-destructive hover:bg-destructive/10"
                                title="Reject"
                                data-testid={`button-reject-achievement-${achievement.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h3 className="font-semibold">Existing Custom Achievements ({customAchievements.filter((a: any) => a.approvalStatus === 'approved').length})</h3>
                    {isLoadingAchievements ? (
                      <p className="text-muted-foreground">Loading...</p>
                    ) : customAchievements.length === 0 ? (
                      <p className="text-muted-foreground">No custom achievements created yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {customAchievements.map((achievement: any) => (
                          <div
                            key={achievement.id}
                            className="flex items-center justify-between border border-border rounded-lg p-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{achievement.emoji}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{achievement.name}</span>
                                  <Badge variant="outline" className={rarityColors[achievement.rarity] || "text-gray-400"}>
                                    {achievement.rarity}
                                  </Badge>
                                  {!achievement.isActive && (
                                    <Badge variant="secondary">Disabled</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{achievement.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {conditionOptions.find(o => o.value === achievement.conditionType)?.label} ({achievement.threshold})
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateAchievementMutation.mutate({ 
                                  id: achievement.id, 
                                  isActive: !achievement.isActive 
                                })}
                                className={achievement.isActive ? "text-green-500" : "text-gray-500"}
                                data-testid={`button-toggle-achievement-${achievement.id}`}
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-destructive hover:bg-destructive/10"
                                    data-testid={`button-delete-achievement-${achievement.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Achievement</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{achievement.name}"? Users who have earned this badge will keep it, but no new users can earn it.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteAchievementMutation.mutate(achievement.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Debug Logs Tab (Owner Only) */}
          {currentUser?.isOwner && (
            <TabsContent value="debug">
              <Card className="border-border bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      Debug Logs
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={debugFilter} onValueChange={setDebugFilter}>
                        <SelectTrigger className="w-32" data-testid="select-debug-filter">
                          <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Actions</SelectItem>
                          <SelectItem value="like">Likes</SelectItem>
                          <SelectItem value="dislike">Dislikes</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchDebugLogs()}
                        data-testid="button-refresh-logs"
                      >
                        Refresh
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" data-testid="button-clear-logs">
                            Clear All
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Clear Debug Logs</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete all debug logs. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => clearDebugLogsMutation.mutate()}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Clear All Logs
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingDebugLogs ? (
                    <p className="text-muted-foreground">Loading logs...</p>
                  ) : debugLogs.length === 0 ? (
                    <p className="text-muted-foreground">No debug logs yet. Try liking a bar to generate logs.</p>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {debugLogs.map((log: any) => {
                        let details;
                        try {
                          details = JSON.parse(log.details);
                        } catch {
                          details = { raw: log.details };
                        }
                        return (
                          <div
                            key={log.id}
                            className={`border rounded-lg p-3 space-y-2 ${
                              log.success ? 'border-border' : 'border-red-500 bg-red-500/10'
                            }`}
                            data-testid={`log-entry-${log.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant={log.success ? "default" : "destructive"}>
                                  {log.action.toUpperCase()}
                                </Badge>
                                {log.success ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                <span className="text-sm text-muted-foreground">
                                  @{details.username || 'unknown'}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.createdAt).toLocaleString()}
                              </span>
                            </div>
                            
                            <div className="text-sm space-y-1">
                              <p><span className="text-muted-foreground">User ID:</span> {log.userId}</p>
                              <p><span className="text-muted-foreground">Bar ID:</span> {log.targetId}</p>
                              {details.liked !== undefined && (
                                <p><span className="text-muted-foreground">Action:</span> {details.liked ? 'Liked' : 'Unliked'}</p>
                              )}
                              {details.disliked !== undefined && (
                                <p><span className="text-muted-foreground">Action:</span> {details.disliked ? 'Disliked' : 'Undisliked'}</p>
                              )}
                              {details.newLikeCount !== undefined && (
                                <p><span className="text-muted-foreground">New Like Count:</span> {details.newLikeCount}</p>
                              )}
                              {details.newDislikeCount !== undefined && (
                                <p><span className="text-muted-foreground">New Dislike Count:</span> {details.newDislikeCount}</p>
                              )}
                              {details.duration && (
                                <p><span className="text-muted-foreground">Duration:</span> {details.duration}ms</p>
                              )}
                              {details.barExists !== undefined && (
                                <p><span className="text-muted-foreground">Bar Exists:</span> {details.barExists ? 'Yes' : 'No'}</p>
                              )}
                              {details.notificationSent && (
                                <p><span className="text-muted-foreground">Notification Sent:</span> Yes</p>
                              )}
                            </div>
                            
                            {log.errorMessage && (
                              <div className="mt-2 p-2 bg-red-500/20 rounded text-sm text-red-300">
                                <strong>Error:</strong> {log.errorMessage}
                              </div>
                            )}
                            
                            {details.stack && (
                              <details className="mt-2">
                                <summary className="text-xs text-muted-foreground cursor-pointer">Stack trace</summary>
                                <pre className="mt-1 text-xs bg-black/30 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                                  {details.stack}
                                </pre>
                              </details>
                            )}
                            
                            <details className="mt-2">
                              <summary className="text-xs text-muted-foreground cursor-pointer">Full details (JSON)</summary>
                              <pre className="mt-1 text-xs bg-black/30 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(details, null, 2)}
                              </pre>
                            </details>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <Dialog open={!!moderateBarId} onOpenChange={(open) => !open && setModerateBarId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Moderate Post</DialogTitle>
              <DialogDescription>
                Remove this post and notify the user. They will receive a notification with your reason.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for removal</Label>
                <Textarea
                  id="reason"
                  placeholder="e.g., Violates community guidelines, inappropriate content..."
                  value={moderateReason}
                  onChange={(e) => setModerateReason(e.target.value)}
                  className="min-h-[100px]"
                  data-testid="input-moderation-reason"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModerateBarId(null)}>
                Cancel
              </Button>
              <Button 
                onClick={handleModerate}
                disabled={!moderateReason.trim() || moderateBarMutation.isPending}
                className="bg-orange-500 hover:bg-orange-600"
                data-testid="button-confirm-moderate"
              >
                {moderateBarMutation.isPending ? "Removing..." : "Remove & Notify"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
