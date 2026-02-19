import type { User, BarWithUser } from "@shared/schema";

type ApiError = {
  message: string;
  aiRejected?: boolean;
  canRequestReview?: boolean;
  reasons?: string[];
  plagiarismRisk?: string;
  plagiarismDetails?: string;
  blocked?: boolean;
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ 
      message: 'An error occurred' 
    }));
    // Create an error that preserves all the extended properties for AI moderation
    const extendedError: any = new Error(error.message);
    if (error.aiRejected) {
      extendedError.aiRejected = error.aiRejected;
      extendedError.canRequestReview = error.canRequestReview;
      extendedError.reasons = error.reasons;
      extendedError.plagiarismRisk = error.plagiarismRisk;
      extendedError.plagiarismDetails = error.plagiarismDetails;
    }
    if (error.blocked) {
      extendedError.blocked = error.blocked;
    }
    throw extendedError;
  }
  return response.json();
}

// Helper to make fetch requests with credentials included
function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include',
  });
}

export const api = {
  // Auth
  sendVerificationCode: async (email: string): Promise<{ message: string }> => {
    const response = await apiFetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse<{ message: string }>(response);
  },

  verifyCode: async (email: string, code: string): Promise<{ verified: boolean }> => {
    const response = await apiFetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    return handleResponse<{ verified: boolean }>(response);
  },

  signup: async (username: string, password: string, email: string, code: string): Promise<User> => {
    const response = await apiFetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email, code }),
    });
    return handleResponse<User>(response);
  },

  signupSimple: async (username: string, password: string): Promise<User> => {
    const response = await apiFetch('/api/auth/signup-simple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse<User>(response);
  },

  login: async (username: string, password: string, rememberMe?: boolean): Promise<User> => {
    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, rememberMe }),
    });
    return handleResponse<User>(response);
  },

  loginWithEmail: async (email: string, password: string, rememberMe?: boolean): Promise<User> => {
    const response = await apiFetch('/api/auth/login-with-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe }),
    });
    return handleResponse<User>(response);
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await apiFetch('/api/auth/logout', {
      method: 'POST',
    });
    return handleResponse<{ message: string }>(response);
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await apiFetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse<{ message: string }>(response);
  },

  resetPassword: async (email: string, code: string, newPassword: string): Promise<{ message: string; username?: string }> => {
    const response = await apiFetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword }),
    });
    return handleResponse<{ message: string; username?: string }>(response);
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiFetch('/api/auth/user');
    return handleResponse<User>(response);
  },

  // Bars
  getBars: async (limit = 50): Promise<BarWithUser[]> => {
    const response = await apiFetch(`/api/bars?limit=${limit}`);
    return handleResponse<BarWithUser[]>(response);
  },

  getBar: async (id: string): Promise<BarWithUser> => {
    const response = await apiFetch(`/api/bars/${id}`);
    return handleResponse<BarWithUser>(response);
  },

  getBarsByUser: async (userId: string): Promise<BarWithUser[]> => {
    const response = await apiFetch(`/api/bars/user/${userId}`);
    return handleResponse<BarWithUser[]>(response);
  },

  createBar: async (data: {
    content: string;
    explanation?: string;
    category: string;
    tags: string[];
    feedbackWanted?: boolean;
    permissionStatus?: string;
    barType?: string;
    fullRapLink?: string;
    isRecorded?: boolean;
    isOriginal?: boolean;
  }): Promise<BarWithUser> => {
    const response = await apiFetch('/api/bars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<BarWithUser>(response);
  },

  deleteBar: async (barId: string): Promise<{ message: string }> => {
    const response = await apiFetch(`/api/bars/${barId}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(response);
  },

  checkSimilarBars: async (content: string): Promise<Array<{ id: string; proofBarId: string; permissionStatus: string; similarity: number; username?: string }>> => {
    const response = await apiFetch('/api/bars/check-similar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    return handleResponse<Array<{ id: string; proofBarId: string; permissionStatus: string; similarity: number; username?: string }>>(response);
  },

  updateBar: async (barId: string, data: {
    content?: string;
    explanation?: string;
    category?: string;
    tags?: string[];
    feedbackWanted?: boolean;
    barType?: string;
    fullRapLink?: string;
    isRecorded?: boolean;
  }): Promise<BarWithUser> => {
    const response = await apiFetch(`/api/bars/${barId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<BarWithUser>(response);
  },

  // Users
  getUser: async (username: string): Promise<User> => {
    const response = await apiFetch(`/api/users/${username}`);
    return handleResponse<User>(response);
  },

  updateProfile: async (data: {
    bio?: string;
    location?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    messagePrivacy?: string;
    notificationSound?: string;
    messageSound?: string;
  }): Promise<User> => {
    const response = await apiFetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<User>(response);
  },

  requestUploadUrl: async (file: { name: string; size: number; type: string }): Promise<{ uploadURL: string; objectPath: string }> => {
    const response = await apiFetch('/api/uploads/request-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        contentType: file.type,
      }),
    });
    return handleResponse<{ uploadURL: string; objectPath: string }>(response);
  },

  // Likes
  toggleLike: async (barId: string): Promise<{ liked: boolean; count: number }> => {
    const response = await apiFetch(`/api/bars/${barId}/like`, { method: 'POST' });
    return handleResponse<{ liked: boolean; count: number }>(response);
  },

  getLikes: async (barId: string): Promise<{ count: number; liked: boolean }> => {
    const response = await apiFetch(`/api/bars/${barId}/likes`);
    return handleResponse<{ count: number; liked: boolean }>(response);
  },

  // Dislikes
  toggleDislike: async (barId: string): Promise<{ disliked: boolean; count: number; likeCount: number; liked: boolean }> => {
    const response = await apiFetch(`/api/bars/${barId}/dislike`, { method: 'POST' });
    return handleResponse<{ disliked: boolean; count: number; likeCount: number; liked: boolean }>(response);
  },

  getDislikes: async (barId: string): Promise<{ count: number; disliked: boolean }> => {
    const response = await apiFetch(`/api/bars/${barId}/dislikes`);
    return handleResponse<{ count: number; disliked: boolean }>(response);
  },

  // Comments
  getComments: async (barId: string): Promise<any[]> => {
    const response = await apiFetch(`/api/bars/${barId}/comments`);
    return handleResponse<any[]>(response);
  },

  createComment: async (barId: string, content: string): Promise<any> => {
    const response = await apiFetch(`/api/bars/${barId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    return handleResponse<any>(response);
  },

  deleteComment: async (commentId: string): Promise<{ message: string }> => {
    const response = await apiFetch(`/api/comments/${commentId}`, { method: 'DELETE' });
    return handleResponse<{ message: string }>(response);
  },

  // Follow
  followUser: async (userId: string): Promise<{ followed: boolean }> => {
    const response = await apiFetch(`/api/users/${userId}/follow`, { method: 'POST' });
    return handleResponse<{ followed: boolean }>(response);
  },

  unfollowUser: async (userId: string): Promise<{ unfollowed: boolean }> => {
    const response = await apiFetch(`/api/users/${userId}/unfollow`, { method: 'POST' });
    return handleResponse<{ unfollowed: boolean }>(response);
  },

  isFollowing: async (userId: string): Promise<boolean> => {
    const response = await apiFetch(`/api/users/${userId}/follow-status`);
    const data = await handleResponse<{ isFollowing: boolean }>(response);
    return data.isFollowing;
  },

  getUserStats: async (userId: string): Promise<{ barsCount: number; followersCount: number; followingCount: number; profileLikesCount: number }> => {
    const response = await apiFetch(`/api/users/${userId}/stats`);
    return handleResponse<{ barsCount: number; followersCount: number; followingCount: number; profileLikesCount: number }>(response);
  },

  getUserAchievements: async (userId: string): Promise<Array<{ achievementId: string; unlockedAt: Date; emoji: string; name: string; description: string }>> => {
    const response = await apiFetch(`/api/users/${userId}/achievements`);
    return handleResponse(response);
  },

  // Username
  changeUsername: async (username: string): Promise<User> => {
    const response = await apiFetch('/api/users/me/username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    return handleResponse<User>(response);
  },

  // Password
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await apiFetch('/api/users/me/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return handleResponse<{ message: string }>(response);
  },

  // Admin
  getAllUsers: async (): Promise<User[]> => {
    const response = await apiFetch('/api/admin/users');
    return handleResponse<User[]>(response);
  },

  adminDeleteBar: async (barId: string): Promise<{ message: string }> => {
    const response = await apiFetch(`/api/admin/bars/${barId}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(response);
  },

  adminDeleteAllBars: async (): Promise<{ message: string }> => {
    const response = await apiFetch('/api/admin/bars', {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(response);
  },

  adminDeleteUser: async (userId: string): Promise<{ message: string }> => {
    const response = await apiFetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(response);
  },

  adminToggleAdmin: async (userId: string, isAdmin: boolean): Promise<User> => {
    const response = await apiFetch(`/api/admin/users/${userId}/admin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAdmin }),
    });
    return handleResponse<User>(response);
  },

  adminToggleVerified: async (userId: string, emailVerified: boolean): Promise<User> => {
    const response = await apiFetch(`/api/admin/users/${userId}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailVerified }),
    });
    return handleResponse<User>(response);
  },

  adminChangeMembership: async (userId: string, membershipTier: string): Promise<User> => {
    const response = await apiFetch(`/api/admin/users/${userId}/membership`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipTier }),
    });
    return handleResponse<User>(response);
  },

  adminModerateBar: async (barId: string, reason: string): Promise<{ message: string }> => {
    const response = await apiFetch(`/api/admin/bars/${barId}/moderate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return handleResponse<{ message: string }>(response);
  },

  // Notifications
  getNotifications: async (limit = 20): Promise<any[]> => {
    const response = await apiFetch(`/api/notifications?limit=${limit}`);
    return handleResponse<any[]>(response);
  },

  getUnreadNotificationCount: async (): Promise<{ count: number }> => {
    const response = await apiFetch('/api/notifications/unread-count');
    return handleResponse<{ count: number }>(response);
  },

  markNotificationRead: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
    return handleResponse<{ success: boolean }>(response);
  },

  markAllNotificationsRead: async (): Promise<{ success: boolean }> => {
    const response = await apiFetch('/api/notifications/read-all', { method: 'POST' });
    return handleResponse<{ success: boolean }>(response);
  },

  // Community surface
  getCommunityStats: async (): Promise<{ totalBars: number; barsThisWeek: number; activeWritersMonth: number }> => {
    const response = await apiFetch('/api/community/stats');
    return handleResponse(response);
  },

  getCommunitySpotlight: async (): Promise<{
    id: string;
    author: string;
    avatarUrl: string | null;
    snippet: string;
    lines: string[];
    titleLine: string;
    reactionCount: number;
    theme: string;
    href: string;
  } | null> => {
    const response = await apiFetch('/api/community/spotlight');
    return handleResponse(response);
  },

  getNowActivity: async (limit = 8): Promise<Array<{
    id: string;
    type: string;
    text: string;
    href: string;
    createdAt: string;
  }>> => {
    const response = await apiFetch(`/api/community/now?limit=${limit}`);
    return handleResponse(response);
  },

  // Prompts
  getPrompts: async (): Promise<Array<{ slug: string; text: string; tag: string; isCurrent: boolean; barsCount: number }>> => {
    const response = await apiFetch('/api/prompts');
    return handleResponse(response);
  },

  getCurrentPrompt: async (): Promise<{ slug: string; text: string; tag: string; barsCount: number; href: string }> => {
    const response = await apiFetch('/api/prompts/current');
    return handleResponse(response);
  },

  getPromptBars: async (slug: string): Promise<{
    prompt: { slug: string; text: string; tag: string };
    bars: BarWithUser[];
  }> => {
    const response = await apiFetch(`/api/prompts/${slug}/bars`);
    return handleResponse(response);
  },

  // Challenges
  getChallenges: async (limit = 30): Promise<Array<BarWithUser & { responseCount?: number }>> => {
    const response = await apiFetch(`/api/challenges?limit=${limit}`);
    return handleResponse(response);
  },

  toggleChallenge: async (barId: string, active: boolean): Promise<any> => {
    const response = await apiFetch(`/api/bars/${barId}/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    return handleResponse(response);
  },

  submitChallengeResponse: async (barId: string, responseBarId: string): Promise<any> => {
    const response = await apiFetch(`/api/bars/${barId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responseBarId }),
    });
    return handleResponse(response);
  },

  getChallengeResponses: async (barId: string): Promise<Array<BarWithUser & { respondedAt?: string }>> => {
    const response = await apiFetch(`/api/bars/${barId}/responses`);
    return handleResponse(response);
  },

  // Quick reactions
  getQuickReactions: async (barId: string): Promise<Record<string, { count: number; reacted: boolean }>> => {
    const response = await apiFetch(`/api/bars/${barId}/reactions`);
    return handleResponse(response);
  },

  toggleQuickReaction: async (barId: string, reactionType: "fire" | "clever" | "deep"): Promise<{
    type: string;
    reacted: boolean;
    count: number;
    reactions: Record<string, { count: number; reacted: boolean }>;
  }> => {
    const response = await apiFetch(`/api/bars/${barId}/reactions/${reactionType}`, {
      method: 'POST',
    });
    return handleResponse(response);
  },
};
