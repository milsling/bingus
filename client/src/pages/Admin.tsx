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
import { Shield, Users, FileText, Trash2, Crown, CheckCircle, XCircle, Ban, Flag, AlertTriangle, Eye, Wrench, Archive, RotateCcw, Trophy, Plus, Pencil, Power, Clock, Check, X, Upload, Image, Star } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useLocation } from "wouter";
import { useBars } from "@/context/BarContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { ACHIEVEMENTS, type User, type BarWithUser } from "@shared/schema";

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
  
  // Console state
  const [consoleQuery, setConsoleQuery] = useState("");
  const [consoleOutput, setConsoleOutput] = useState<any>(null);
  const [consoleHistory, setConsoleHistory] = useState<string[]>([]);
  const [actionUsername, setActionUsername] = useState("");
  
  // Custom Tags state
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<any>(null);
  const [tagName, setTagName] = useState("");
  const [tagDisplayName, setTagDisplayName] = useState("");
  const [tagAnimation, setTagAnimation] = useState("none");
  const [tagColor, setTagColor] = useState("");
  const [tagBgColor, setTagBgColor] = useState("");
  const [tagImageUrl, setTagImageUrl] = useState("");

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
  
  // Advanced achievement builder state
  const [useAdvancedMode, setUseAdvancedMode] = useState(false);
  const [ruleOperator, setRuleOperator] = useState<"AND" | "OR">("AND");
  type RuleCondition = { 
    id: string; 
    metric: string; 
    comparator: string; 
    value: number; 
    keyword?: string; 
    negated?: boolean;
    timeRangeStart?: number;
    timeRangeEnd?: number;
  };
  const [ruleConditions, setRuleConditions] = useState<RuleCondition[]>([
    { id: "1", metric: "bars_posted", comparator: ">=", value: 1 }
  ]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [suggestedRarity, setSuggestedRarity] = useState<string | null>(null);
  
  const timeBasedMetrics = ["early_bird", "night_owl"];
  const defaultTimeRanges: Record<string, { start: number; end: number }> = {
    early_bird: { start: 5, end: 9 },
    night_owl: { start: 22, end: 4 },
  };
  
  const addRuleCondition = () => {
    const newCondition: RuleCondition = { 
      id: Date.now().toString(), 
      metric: "bars_posted", 
      comparator: ">=", 
      value: 1 
    };
    const newConditions = [...ruleConditions, newCondition];
    setRuleConditions(newConditions);
    validateConditions(newConditions);
  };
  
  const removeRuleCondition = (id: string) => {
    if (ruleConditions.length > 1) {
      const newConditions = ruleConditions.filter(c => c.id !== id);
      setRuleConditions(newConditions);
      validateConditions(newConditions);
    }
  };
  
  const updateRuleCondition = (id: string, updates: Partial<RuleCondition>) => {
    const newConditions = ruleConditions.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, ...updates };
      if (updates.metric && timeBasedMetrics.includes(updates.metric)) {
        const defaults = defaultTimeRanges[updates.metric];
        updated.timeRangeStart = defaults.start;
        updated.timeRangeEnd = defaults.end;
      } else if (updates.metric && !timeBasedMetrics.includes(updates.metric)) {
        delete updated.timeRangeStart;
        delete updated.timeRangeEnd;
      }
      return updated;
    });
    setRuleConditions(newConditions);
    validateConditions(newConditions);
  };
  
  const validateConditionsWithOperator = (conditions: RuleCondition[], operator: "AND" | "OR") => {
    const warnings: string[] = [];
    
    for (let i = 0; i < conditions.length; i++) {
      for (let j = i + 1; j < conditions.length; j++) {
        const a = conditions[i];
        const b = conditions[j];
        if (a.metric === b.metric && a.comparator === b.comparator && a.value === b.value && 
            a.keyword === b.keyword && a.negated === b.negated) {
          warnings.push(`Duplicate condition detected: "${conditionOptions.find(o => o.value === a.metric)?.label || a.metric}"`);
        }
        if (a.metric === b.metric && a.comparator === b.comparator && a.value === b.value && 
            a.keyword === b.keyword && a.negated !== b.negated && operator === "AND") {
          warnings.push(`Logical conflict: condition AND NOT same condition will never be true`);
        }
      }
    }
    
    setValidationWarnings(warnings);
    
    const orCount = operator === "OR" ? conditions.length - 1 : 0;
    const andCount = operator === "AND" ? conditions.length - 1 : 0;
    const maxThreshold = Math.max(...conditions.map(c => c.value));
    const hasNegated = conditions.some(c => c.negated);
    
    let suggested: string;
    if (orCount >= 3) {
      suggested = "common";
    } else if (orCount >= 1 && maxThreshold < 20) {
      suggested = "uncommon";
    } else if (andCount >= 2 && maxThreshold >= 50) {
      suggested = "legendary";
    } else if (andCount >= 1 && maxThreshold >= 25) {
      suggested = "epic";
    } else if (maxThreshold >= 10 || hasNegated) {
      suggested = "rare";
    } else {
      suggested = "common";
    }
    setSuggestedRarity(suggested);
  };
  
  const validateConditions = (conditions: RuleCondition[]) => {
    validateConditionsWithOperator(conditions, ruleOperator);
  };
  
  const buildRuleTree = () => {
    if (ruleConditions.length === 1) {
      const c = ruleConditions[0];
      return {
        type: "condition" as const,
        metric: c.metric,
        comparator: c.comparator,
        value: c.value,
        ...(c.metric === "bars_with_keyword" && c.keyword ? { keyword: c.keyword } : {}),
        ...(c.negated ? { negated: true } : {}),
        ...(timeBasedMetrics.includes(c.metric) && c.timeRangeStart !== undefined ? { 
          timeRange: { start: c.timeRangeStart, end: c.timeRangeEnd || 0 } 
        } : {})
      };
    }
    return {
      type: "group" as const,
      operator: ruleOperator,
      children: ruleConditions.map(c => ({
        type: "condition" as const,
        metric: c.metric,
        comparator: c.comparator,
        value: c.value,
        ...(c.metric === "bars_with_keyword" && c.keyword ? { keyword: c.keyword } : {}),
        ...(c.negated ? { negated: true } : {}),
        ...(timeBasedMetrics.includes(c.metric) && c.timeRangeStart !== undefined ? { 
          timeRange: { start: c.timeRangeStart, end: c.timeRangeEnd || 0 } 
        } : {})
      }))
    };
  };
  
  const generateRulePreview = (): React.ReactNode => {
    const parts = ruleConditions.map((c, idx) => {
      const opt = conditionOptions.find(o => o.value === c.metric);
      const label = opt?.label || c.metric;
      let conditionText = "";
      if (c.metric === "bars_with_keyword" && c.keyword) {
        conditionText = `${label} "${c.keyword}" ${c.comparator} ${c.value}`;
      } else if (timeBasedMetrics.includes(c.metric) && c.timeRangeStart !== undefined) {
        const formatHour = (h: number) => `${h % 12 || 12}${h < 12 ? 'AM' : 'PM'}`;
        conditionText = `${label} (${formatHour(c.timeRangeStart)}-${formatHour(c.timeRangeEnd || 0)})`;
      } else {
        conditionText = `${label} ${c.comparator} ${c.value}`;
      }
      
      if (c.negated) {
        conditionText = `NOT (${conditionText})`;
      }
      
      return { text: conditionText, idx };
    });
    
    return (
      <span>
        {parts.map((part, i) => (
          <span key={part.idx}>
            {part.text}
            {i < parts.length - 1 && (
              <span className={ruleOperator === "AND" ? "text-blue-400 font-semibold mx-1" : "text-orange-400 font-semibold mx-1"}>
                {ruleOperator}
              </span>
            )}
          </span>
        ))}
      </span>
    );
  };
  
  const resetAdvancedMode = () => {
    setRuleConditions([{ id: "1", metric: "bars_posted", comparator: ">=", value: 1 }]);
    setRuleOperator("AND");
    setValidationWarnings([]);
    setSuggestedRarity(null);
  };

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
    mutationFn: async (data: { name: string; emoji: string; description: string; rarity: string; conditionType: string; threshold: number; ruleTree?: any }) => {
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
      setUseAdvancedMode(false);
      resetAdvancedMode();
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

  // Badge images query and mutations (owner only)
  const { data: badgeImages = {} } = useQuery<Record<string, string>>({
    queryKey: ['achievements', 'badge-images'],
    queryFn: async () => {
      const res = await fetch('/api/achievements/badge-images', { credentials: 'include' });
      if (!res.ok) return {};
      return res.json();
    },
    enabled: !!currentUser?.isOwner,
  });

  const [uploadingBadgeId, setUploadingBadgeId] = useState<string | null>(null);
  const [badgeUploadProgress, setBadgeUploadProgress] = useState<Record<string, boolean>>({});

  const uploadBadgeImage = async (badgeId: string, file: File) => {
    try {
      setBadgeUploadProgress(prev => ({ ...prev, [badgeId]: true }));
      
      const extension = file.name.split('.').pop() || 'png';
      
      const urlRes = await fetch('/api/uploads/badge-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ badgeId, extension }),
      });
      
      if (!urlRes.ok) {
        const err = await urlRes.json();
        throw new Error(err.error || 'Failed to get upload URL');
      }
      
      const { uploadURL, publicURL } = await urlRes.json();
      
      const uploadRes = await fetch(uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      
      if (!uploadRes.ok) {
        throw new Error('Failed to upload file');
      }
      
      await setBadgeImageMutation.mutateAsync({ id: badgeId, imageUrl: publicURL });
      
      toast({ title: "Badge image uploaded" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setBadgeUploadProgress(prev => ({ ...prev, [badgeId]: false }));
    }
  };

  const setBadgeImageMutation = useMutation({
    mutationFn: async ({ id, imageUrl }: { id: string; imageUrl: string }) => {
      const res = await fetch(`/api/admin/achievements/${id}/badge-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ imageUrl }),
      });
      if (!res.ok) throw new Error('Failed to set badge image');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements', 'badge-images'] });
      setUploadingBadgeId(null);
      toast({ title: "Badge image updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteBadgeImageMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/achievements/${id}/badge-image`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete badge image');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements', 'badge-images'] });
      toast({ title: "Badge image removed" });
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

  // Custom Tags query and mutations (owner only)
  const { data: customTags = [], isLoading: isLoadingTags } = useQuery<any[]>({
    queryKey: ['admin', 'tags'],
    queryFn: async () => {
      const res = await fetch('/api/admin/tags', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch custom tags');
      return res.json();
    },
    enabled: !!currentUser?.isOwner,
  });

  const createTagMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create tag');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tags'] });
      setShowTagDialog(false);
      resetTagForm();
      toast({ title: "Custom tag created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & any) => {
      const res = await fetch(`/api/admin/tags/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update tag');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tags'] });
      setShowTagDialog(false);
      setEditingTag(null);
      resetTagForm();
      toast({ title: "Tag updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/tags/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete tag');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tags'] });
      toast({ title: "Tag deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetTagForm = () => {
    setTagName("");
    setTagDisplayName("");
    setTagAnimation("none");
    setTagColor("");
    setTagBgColor("");
    setTagImageUrl("");
    setEditingTag(null);
  };

  const openEditTagDialog = (tag: any) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagDisplayName(tag.displayName || "");
    setTagAnimation(tag.animation || "none");
    setTagColor(tag.color || "");
    setTagBgColor(tag.backgroundColor || "");
    setTagImageUrl(tag.imageUrl || "");
    setShowTagDialog(true);
  };

  const handleSaveTag = () => {
    const data = {
      name: tagName,
      displayName: tagDisplayName || null,
      animation: tagAnimation,
      color: tagColor || null,
      backgroundColor: tagBgColor || null,
      imageUrl: tagImageUrl || null,
    };
    if (editingTag) {
      updateTagMutation.mutate({ id: editingTag.id, ...data });
    } else {
      createTagMutation.mutate(data);
    }
  };

  const tagAnimationOptions = [
    { value: "none", label: "None", preview: "" },
    { value: "pulse", label: "Pulse", preview: "animate-pulse" },
    { value: "glow", label: "Glow", preview: "shadow-lg shadow-primary/50" },
    { value: "shimmer", label: "Shimmer", preview: "animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent" },
    { value: "bounce", label: "Bounce", preview: "hover:animate-bounce" },
    { value: "sparkle", label: "Sparkle", preview: "animate-pulse" },
    { value: "gradient", label: "Gradient", preview: "bg-gradient-to-r from-purple-500 to-pink-500" },
  ];

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
    { value: "bars_with_keyword", label: "Bars with Keyword", description: "Post X bars containing a specific word" },
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
            {currentUser?.isOwner && (
              <TabsTrigger value="tags" className="gap-1 text-xs px-2">
                <Flag className="h-4 w-4" />
                <span className="hidden sm:inline">Tags</span>
              </TabsTrigger>
            )}
            {(currentUser?.isOwner || currentUser?.isAdminPlus) && (
              <TabsTrigger value="debug" className="gap-1 text-xs px-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Logs</span>
              </TabsTrigger>
            )}
            {currentUser?.isOwner && (
              <TabsTrigger value="console" className="gap-1 text-xs px-2">
                <Power className="h-4 w-4" />
                <span className="hidden sm:inline">Console</span>
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
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Switch
                        id="advanced-mode"
                        checked={useAdvancedMode}
                        onCheckedChange={(checked) => {
                          setUseAdvancedMode(checked);
                          if (!checked) resetAdvancedMode();
                        }}
                        data-testid="switch-advanced-mode"
                      />
                      <Label htmlFor="advanced-mode" className="cursor-pointer">
                        Advanced Mode (combine multiple conditions with AND/OR)
                      </Label>
                    </div>

                    {!useAdvancedMode ? (
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
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Label>Logic:</Label>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant={ruleOperator === "AND" ? "default" : "outline"}
                              size="sm"
                              onClick={() => { setRuleOperator("AND"); validateConditionsWithOperator(ruleConditions, "AND"); }}
                              className={ruleOperator === "AND" ? "bg-blue-600 hover:bg-blue-700" : ""}
                              data-testid="button-operator-and"
                            >
                              <span className={ruleOperator === "AND" ? "" : "text-blue-400"}>AND</span>
                              <span className="ml-1 text-xs opacity-70">(all must be true)</span>
                            </Button>
                            <Button
                              type="button"
                              variant={ruleOperator === "OR" ? "default" : "outline"}
                              size="sm"
                              onClick={() => { setRuleOperator("OR"); validateConditionsWithOperator(ruleConditions, "OR"); }}
                              className={ruleOperator === "OR" ? "bg-orange-600 hover:bg-orange-700" : ""}
                              data-testid="button-operator-or"
                            >
                              <span className={ruleOperator === "OR" ? "" : "text-orange-400"}>OR</span>
                              <span className="ml-1 text-xs opacity-70">(any can be true)</span>
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {ruleConditions.map((cond, idx) => (
                            <div key={cond.id} className={`p-3 border rounded-lg bg-card ${cond.negated ? 'border-red-500/50 bg-red-500/5' : 'border-border'}`}>
                              <div className="flex items-start gap-2">
                                <div className="flex items-center gap-2 pt-2">
                                  <input
                                    type="checkbox"
                                    id={`not-${cond.id}`}
                                    checked={cond.negated || false}
                                    onChange={(e) => updateRuleCondition(cond.id, { negated: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                                    data-testid={`checkbox-not-${idx}`}
                                  />
                                  <Label htmlFor={`not-${cond.id}`} className={`text-xs font-medium ${cond.negated ? 'text-red-400' : 'text-muted-foreground'}`}>
                                    NOT
                                  </Label>
                                </div>
                                
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                                  <Select
                                    value={cond.metric}
                                    onValueChange={(v) => updateRuleCondition(cond.id, { metric: v })}
                                  >
                                    <SelectTrigger data-testid={`select-condition-metric-${idx}`}>
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
                                  
                                  {cond.metric === "bars_with_keyword" && (
                                    <Input
                                      placeholder="Keyword (e.g., Christmas)"
                                      value={cond.keyword || ""}
                                      onChange={(e) => updateRuleCondition(cond.id, { keyword: e.target.value })}
                                      data-testid={`input-condition-keyword-${idx}`}
                                    />
                                  )}
                                  
                                  {!timeBasedMetrics.includes(cond.metric) && (
                                    <>
                                      <Select
                                        value={cond.comparator}
                                        onValueChange={(v) => updateRuleCondition(cond.id, { comparator: v })}
                                      >
                                        <SelectTrigger data-testid={`select-condition-comparator-${idx}`}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value=">=">at least (≥)</SelectItem>
                                          <SelectItem value=">">more than (&gt;)</SelectItem>
                                          <SelectItem value="=">exactly (=)</SelectItem>
                                          <SelectItem value="<">less than (&lt;)</SelectItem>
                                          <SelectItem value="<=">at most (≤)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      
                                      <Input
                                        type="number"
                                        min={0}
                                        value={cond.value}
                                        onChange={(e) => updateRuleCondition(cond.id, { value: parseInt(e.target.value) || 0 })}
                                        data-testid={`input-condition-value-${idx}`}
                                      />
                                    </>
                                  )}
                                  
                                  {timeBasedMetrics.includes(cond.metric) && (
                                    <div className="col-span-2 flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <Select
                                          value={String(cond.timeRangeStart ?? defaultTimeRanges[cond.metric]?.start ?? 0)}
                                          onValueChange={(v) => updateRuleCondition(cond.id, { timeRangeStart: parseInt(v) })}
                                        >
                                          <SelectTrigger className="w-24" data-testid={`select-time-start-${idx}`}>
                                            <SelectValue placeholder="Start" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {Array.from({ length: 24 }, (_, i) => (
                                              <SelectItem key={i} value={String(i)}>
                                                {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <span className="text-muted-foreground">to</span>
                                        <Select
                                          value={String(cond.timeRangeEnd ?? defaultTimeRanges[cond.metric]?.end ?? 0)}
                                          onValueChange={(v) => updateRuleCondition(cond.id, { timeRangeEnd: parseInt(v) })}
                                        >
                                          <SelectTrigger className="w-24" data-testid={`select-time-end-${idx}`}>
                                            <SelectValue placeholder="End" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {Array.from({ length: 24 }, (_, i) => (
                                              <SelectItem key={i} value={String(i)}>
                                                {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <span className="text-xs text-muted-foreground">(PST)</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        Default: {cond.metric === 'early_bird' ? '5-9 AM' : '10 PM-4 AM'}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                
                                {ruleConditions.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeRuleCondition(cond.id)}
                                    className="text-destructive hover:bg-destructive/10"
                                    data-testid={`button-remove-condition-${idx}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addRuleCondition}
                          className="w-full"
                          data-testid="button-add-condition"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Condition
                        </Button>
                        
                        {ruleConditions.length > 0 && (
                          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                            <p className="text-sm font-medium">Preview:</p>
                            <p className="text-sm">
                              Unlock when: {generateRulePreview()}
                            </p>
                            
                            {validationWarnings.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {validationWarnings.map((warning, i) => (
                                  <p key={i} className="text-sm text-orange-400 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {warning}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="achievement-rarity-adv" className="flex items-center gap-2">
                              Rarity
                              {suggestedRarity && suggestedRarity !== newAchievementRarity && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-2 text-xs text-blue-400 hover:text-blue-300"
                                  onClick={() => setNewAchievementRarity(suggestedRarity)}
                                  data-testid="button-apply-suggested-rarity"
                                >
                                  Suggested: {suggestedRarity}
                                </Button>
                              )}
                            </Label>
                            <Select value={newAchievementRarity} onValueChange={setNewAchievementRarity}>
                              <SelectTrigger id="achievement-rarity-adv" data-testid="select-achievement-rarity-adv">
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
                      </div>
                    )}
                    
                    <Button
                      onClick={() => {
                        if (useAdvancedMode) {
                          createAchievementMutation.mutate({
                            name: newAchievementName,
                            emoji: newAchievementEmoji,
                            description: newAchievementDescription,
                            rarity: newAchievementRarity,
                            conditionType: ruleConditions[0]?.metric || "bars_posted",
                            threshold: ruleConditions[0]?.value || 1,
                            ruleTree: buildRuleTree(),
                          });
                        } else {
                          createAchievementMutation.mutate({
                            name: newAchievementName,
                            emoji: newAchievementEmoji,
                            description: newAchievementDescription,
                            rarity: newAchievementRarity,
                            conditionType: newAchievementCondition,
                            threshold: newAchievementThreshold,
                          });
                        }
                      }}
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
                                  {conditionOptions.find(o => o.value === achievement.conditionType)?.label} 
                                  {editingAchievement?.id === achievement.id ? (
                                    <div className="inline-flex items-center gap-2 ml-2">
                                      <Input
                                        type="number"
                                        className="w-16 h-6 text-[10px] px-1"
                                        value={editingAchievement.threshold}
                                        onChange={(e) => setEditingAchievement({
                                          ...editingAchievement,
                                          threshold: parseInt(e.target.value) || 1
                                        })}
                                      />
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 text-green-500"
                                        onClick={() => updateAchievementMutation.mutate(editingAchievement)}
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 text-red-500"
                                        onClick={() => setEditingAchievement(null)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1">
                                      ({achievement.threshold})
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                                        onClick={() => setEditingAchievement({ ...achievement })}
                                      >
                                        <Pencil className="h-2 w-2" />
                                      </Button>
                                    </span>
                                  )}
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

                  {currentUser?.isOwner && (
                    <div className="border border-border rounded-lg p-4 space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Badge Images (80×24px recommended)
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Upload custom images for achievement badges. Images will replace emojis in the display.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(ACHIEVEMENTS).map(([id, achievement]) => (
                          <div key={id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card/50">
                            <div className="flex-shrink-0 w-20 h-6 flex items-center justify-center bg-muted rounded overflow-hidden">
                              {badgeImages[id] ? (
                                <img src={badgeImages[id]} alt={achievement.name} className="h-6 object-contain" />
                              ) : (
                                <span className="text-lg">{achievement.emoji}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{achievement.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{achievement.rarity}</p>
                            </div>
                            <div className="flex gap-1 items-center">
                              {badgeUploadProgress[id] ? (
                                <span className="text-xs text-muted-foreground">Uploading...</span>
                              ) : (
                                <>
                                  <label className="cursor-pointer">
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          uploadBadgeImage(id, file);
                                          e.target.value = '';
                                        }
                                      }}
                                      data-testid={`input-badge-file-${id}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2"
                                      asChild
                                    >
                                      <span>
                                        <Upload className="h-3 w-3" />
                                      </span>
                                    </Button>
                                  </label>
                                  {badgeImages[id] && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-destructive"
                                      onClick={() => deleteBadgeImageMutation.mutate(id)}
                                      data-testid={`button-delete-badge-${id}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Custom Tags Tab (Owner Only) */}
          {currentUser?.isOwner && (
            <TabsContent value="tags">
              <Card className="border-border bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flag className="h-5 w-5 text-purple-500" />
                      Custom Tag Library
                    </div>
                    <Button onClick={() => { resetTagForm(); setShowTagDialog(true); }} size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      New Tag
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create custom tags with animations and images. When users add these tags to their bars, they'll get the styling you define here.
                  </p>
                  
                  {isLoadingTags ? (
                    <p className="text-muted-foreground">Loading tags...</p>
                  ) : customTags.length === 0 ? (
                    <p className="text-muted-foreground">No custom tags yet. Create your first one!</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {customTags.map((tag: any) => (
                        <div key={tag.id} className="border border-border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {tag.imageUrl ? (
                                <img src={tag.imageUrl} alt={tag.name} className="h-6 w-6 object-cover rounded" />
                              ) : (
                                <Badge 
                                  variant="secondary" 
                                  className={`${tag.animation === 'pulse' ? 'animate-pulse' : ''} ${tag.animation === 'glow' ? 'shadow-lg shadow-primary/50' : ''}`}
                                  style={{ 
                                    color: tag.color || undefined, 
                                    backgroundColor: tag.backgroundColor || undefined 
                                  }}
                                >
                                  #{tag.displayName || tag.name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge variant={tag.isActive ? "default" : "secondary"} className="text-xs">
                                {tag.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>Name: <span className="text-foreground">#{tag.name}</span></p>
                            {tag.displayName && <p>Display: <span className="text-foreground">{tag.displayName}</span></p>}
                            <p>Animation: <span className="text-foreground capitalize">{tag.animation}</span></p>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditTagDialog(tag)}>
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateTagMutation.mutate({ id: tag.id, isActive: !tag.isActive })}
                            >
                              {tag.isActive ? "Disable" : "Enable"}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Tag</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the tag "#{tag.name}"? This won't remove the tag from existing bars, but it will stop applying custom styling.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteTagMutation.mutate(tag.id)}>
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
                </CardContent>
              </Card>

              {/* Tag Create/Edit Dialog */}
              <Dialog open={showTagDialog} onOpenChange={(open) => { setShowTagDialog(open); if (!open) resetTagForm(); }}>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingTag ? "Edit Tag" : "Create New Tag"}</DialogTitle>
                    <DialogDescription>
                      {editingTag ? "Update the tag settings below." : "Create a custom tag with styling and animation."}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tag-name">Tag Name *</Label>
                        <Input
                          id="tag-name"
                          value={tagName}
                          onChange={(e) => setTagName(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                          placeholder="fire"
                          disabled={!!editingTag}
                        />
                        <p className="text-xs text-muted-foreground">Lowercase, no spaces. This is what users type.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tag-display">Display Name</Label>
                        <Input
                          id="tag-display"
                          value={tagDisplayName}
                          onChange={(e) => setTagDisplayName(e.target.value)}
                          placeholder="Optional: Fire 🔥"
                        />
                        <p className="text-xs text-muted-foreground">How it appears (can include emoji).</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Animation Effect</Label>
                      <Select value={tagAnimation} onValueChange={setTagAnimation}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tagAnimationOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tag-color">Text Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="tag-color"
                            value={tagColor}
                            onChange={(e) => setTagColor(e.target.value)}
                            placeholder="#ffffff"
                          />
                          <input 
                            type="color" 
                            value={tagColor || "#ffffff"} 
                            onChange={(e) => setTagColor(e.target.value)}
                            className="w-10 h-10 rounded border cursor-pointer"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tag-bg">Background Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="tag-bg"
                            value={tagBgColor}
                            onChange={(e) => setTagBgColor(e.target.value)}
                            placeholder="#6b21a8"
                          />
                          <input 
                            type="color" 
                            value={tagBgColor || "#6b21a8"} 
                            onChange={(e) => setTagBgColor(e.target.value)}
                            className="w-10 h-10 rounded border cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Tag Image (optional)</Label>
                      <div className="flex items-center gap-3">
                        {tagImageUrl ? (
                          <div className="flex items-center gap-2">
                            <img src={tagImageUrl} alt="Tag preview" className="h-10 w-10 object-contain rounded border" />
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setTagImageUrl("")}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <ObjectUploader
                            maxNumberOfFiles={1}
                            maxFileSize={2097152}
                            onGetUploadParameters={async (file) => {
                              const res = await fetch('/api/uploads/presigned-url', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({
                                  filename: file.name,
                                  contentType: file.type,
                                  directory: 'tag-images',
                                }),
                              });
                              const data = await res.json();
                              return {
                                method: 'PUT' as const,
                                url: data.uploadUrl,
                                headers: { 'Content-Type': file.type || 'application/octet-stream' },
                              };
                            }}
                            onComplete={(result) => {
                              if (result.successful && result.successful.length > 0) {
                                const file = result.successful[0];
                                const publicUrl = (file.response?.body as any)?.publicUrl || file.uploadURL?.split('?')[0];
                                if (publicUrl) {
                                  setTagImageUrl(publicUrl);
                                }
                              }
                            }}
                            buttonClassName="w-full"
                          >
                            <Image className="h-4 w-4 mr-2" />
                            Upload Tag Image
                          </ObjectUploader>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">If set, displays as an image instead of text badge. Max 2MB.</p>
                    </div>

                    {/* Preview */}
                    <div className="border rounded-lg p-4 bg-secondary/20">
                      <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
                      <div className="flex items-center gap-2">
                        {tagImageUrl ? (
                          <img src={tagImageUrl} alt="Tag preview" className="h-6 w-6 object-cover rounded" />
                        ) : (
                          <Badge 
                            variant="secondary"
                            className={`${tagAnimation === 'pulse' ? 'animate-pulse' : ''} ${tagAnimation === 'glow' ? 'shadow-lg shadow-primary/50' : ''} ${tagAnimation === 'bounce' ? 'hover:animate-bounce' : ''}`}
                            style={{ 
                              color: tagColor || undefined, 
                              backgroundColor: tagBgColor || undefined 
                            }}
                          >
                            #{tagDisplayName || tagName || "tagname"}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">← How it will look</span>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setShowTagDialog(false); resetTagForm(); }}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveTag} disabled={!tagName.trim() || createTagMutation.isPending || updateTagMutation.isPending}>
                      {editingTag ? "Update Tag" : "Create Tag"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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

          {currentUser?.isOwner && (
            <TabsContent value="console">
              <Card className="border-border bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Power className="h-5 w-5 text-purple-500" />
                    Owner Console
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>SQL Query (SELECT only)</Label>
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="SELECT * FROM users LIMIT 10"
                        value={consoleQuery}
                        onChange={(e) => setConsoleQuery(e.target.value)}
                        className="font-mono text-sm min-h-[80px]"
                        data-testid="input-console-query"
                      />
                    </div>
                    <Button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/owner/console/query', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ query: consoleQuery }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.message);
                          setConsoleOutput(data);
                          setConsoleHistory(prev => [consoleQuery, ...prev.slice(0, 9)]);
                          toast({ title: `Query returned ${data.rowCount} rows` });
                        } catch (error: any) {
                          toast({ title: "Query Error", description: error.message, variant: "destructive" });
                        }
                      }}
                      disabled={!consoleQuery.trim()}
                      data-testid="button-run-query"
                    >
                      Run Query
                    </Button>
                    
                    {consoleOutput && (
                      <div className="mt-4 border border-border rounded-lg overflow-hidden">
                        <div className="bg-muted/50 px-3 py-2 text-sm font-medium">
                          Results ({consoleOutput.rowCount} rows)
                        </div>
                        <div className="max-h-[300px] overflow-auto">
                          <pre className="p-3 text-xs font-mono whitespace-pre-wrap">
                            {JSON.stringify(consoleOutput.rows, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border pt-6">
                    <h3 className="font-semibold mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Look up user by username</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="username"
                            value={actionUsername}
                            onChange={(e) => setActionUsername(e.target.value)}
                            data-testid="input-lookup-username"
                          />
                          <Button
                            variant="outline"
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/owner/console/action', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ action: 'get_user_by_username', params: { username: actionUsername } }),
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.message);
                                setConsoleOutput({ rows: [data.result], rowCount: 1 });
                                toast({ title: "User found" });
                              } catch (error: any) {
                                toast({ title: "Error", description: error.message, variant: "destructive" });
                              }
                            }}
                            disabled={!actionUsername.trim()}
                            data-testid="button-lookup-user"
                          >
                            Look Up
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Calculate Retroactive XP</Label>
                        <Button
                          variant="outline"
                          className="w-full"
                          data-testid="button-retro-xp"
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/retro-xp', {
                                method: 'POST',
                                credentials: 'include',
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.message);
                              toast({ title: "Retroactive XP Calculated", description: `Updated ${data.results?.length || 0} users` });
                              setConsoleOutput({ rows: data.results || [], rowCount: data.results?.length || 0 });
                            } catch (error: any) {
                              toast({ title: "Error", description: error.message, variant: "destructive" });
                            }
                          }}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          Run XP Calculation
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label>Clear Debug Logs</Label>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" className="w-full" data-testid="button-clear-logs">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Clear All Logs
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Clear Debug Logs?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete all debug logs. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={async () => {
                                  try {
                                    const res = await fetch('/api/owner/console/action', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      credentials: 'include',
                                      body: JSON.stringify({ action: 'clear_debug_logs' }),
                                    });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data.message);
                                    queryClient.invalidateQueries({ queryKey: ['admin', 'debug-logs'] });
                                    toast({ title: "Debug logs cleared" });
                                  } catch (error: any) {
                                    toast({ title: "Error", description: error.message, variant: "destructive" });
                                  }
                                }}
                              >
                                Clear Logs
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>

                  {consoleHistory.length > 0 && (
                    <div className="border-t border-border pt-6">
                      <h3 className="font-semibold mb-3">Recent Queries</h3>
                      <div className="space-y-2">
                        {consoleHistory.map((query, idx) => (
                          <button
                            key={idx}
                            className="w-full text-left p-2 text-sm font-mono bg-muted/50 rounded hover:bg-muted truncate"
                            onClick={() => setConsoleQuery(query)}
                          >
                            {query}
                          </button>
                        ))}
                      </div>
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
