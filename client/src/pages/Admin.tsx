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
import { Shield, Users, FileText, Trash2, Crown, CheckCircle, XCircle, Ban, Flag, AlertTriangle, Eye } from "lucide-react";
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
          <TabsList className="grid w-full grid-cols-5 mb-6">
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
            <TabsTrigger value="users" className="gap-1 text-xs px-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="bars" className="gap-1 text-xs px-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Bars</span>
            </TabsTrigger>
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
