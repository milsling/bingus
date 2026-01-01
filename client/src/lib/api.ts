import type { User, BarWithUser } from "@shared/schema";

type ApiError = {
  message: string;
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ 
      message: 'An error occurred' 
    }));
    throw new Error(error.message);
  }
  return response.json();
}

export const api = {
  // Auth
  sendVerificationCode: async (email: string): Promise<{ message: string }> => {
    const response = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse<{ message: string }>(response);
  },

  verifyCode: async (email: string, code: string): Promise<{ verified: boolean }> => {
    const response = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    return handleResponse<{ verified: boolean }>(response);
  },

  signup: async (username: string, password: string, email: string, code: string): Promise<User> => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email, code }),
    });
    return handleResponse<User>(response);
  },

  signupSimple: async (username: string, password: string): Promise<User> => {
    const response = await fetch('/api/auth/signup-simple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse<User>(response);
  },

  login: async (username: string, password: string): Promise<User> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse<User>(response);
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    });
    return handleResponse<{ message: string }>(response);
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse<{ message: string }>(response);
  },

  resetPassword: async (email: string, code: string, newPassword: string): Promise<{ message: string; username?: string }> => {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword }),
    });
    return handleResponse<{ message: string; username?: string }>(response);
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await fetch('/api/auth/user');
    return handleResponse<User>(response);
  },

  // Bars
  getBars: async (limit = 50): Promise<BarWithUser[]> => {
    const response = await fetch(`/api/bars?limit=${limit}`);
    return handleResponse<BarWithUser[]>(response);
  },

  getBar: async (id: string): Promise<BarWithUser> => {
    const response = await fetch(`/api/bars/${id}`);
    return handleResponse<BarWithUser>(response);
  },

  getBarsByUser: async (userId: string): Promise<BarWithUser[]> => {
    const response = await fetch(`/api/bars/user/${userId}`);
    return handleResponse<BarWithUser[]>(response);
  },

  createBar: async (data: {
    content: string;
    explanation?: string;
    category: string;
    tags: string[];
  }): Promise<BarWithUser> => {
    const response = await fetch('/api/bars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<BarWithUser>(response);
  },

  deleteBar: async (barId: string): Promise<{ message: string }> => {
    const response = await fetch(`/api/bars/${barId}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(response);
  },

  updateBar: async (barId: string, data: {
    content?: string;
    explanation?: string;
    category?: string;
    tags?: string[];
  }): Promise<BarWithUser> => {
    const response = await fetch(`/api/bars/${barId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<BarWithUser>(response);
  },

  // Users
  getUser: async (username: string): Promise<User> => {
    const response = await fetch(`/api/users/${username}`);
    return handleResponse<User>(response);
  },

  updateProfile: async (data: {
    bio?: string;
    location?: string;
    avatarUrl?: string;
  }): Promise<User> => {
    const response = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<User>(response);
  },

  requestUploadUrl: async (file: { name: string; size: number; type: string }): Promise<{ uploadURL: string; objectPath: string }> => {
    const response = await fetch('/api/uploads/request-url', {
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
    const response = await fetch(`/api/bars/${barId}/like`, { method: 'POST' });
    return handleResponse<{ liked: boolean; count: number }>(response);
  },

  getLikes: async (barId: string): Promise<{ count: number; liked: boolean }> => {
    const response = await fetch(`/api/bars/${barId}/likes`);
    return handleResponse<{ count: number; liked: boolean }>(response);
  },

  // Comments
  getComments: async (barId: string): Promise<any[]> => {
    const response = await fetch(`/api/bars/${barId}/comments`);
    return handleResponse<any[]>(response);
  },

  createComment: async (barId: string, content: string): Promise<any> => {
    const response = await fetch(`/api/bars/${barId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    return handleResponse<any>(response);
  },

  deleteComment: async (commentId: string): Promise<{ message: string }> => {
    const response = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
    return handleResponse<{ message: string }>(response);
  },

  // Follow
  followUser: async (userId: string): Promise<{ followed: boolean }> => {
    const response = await fetch(`/api/users/${userId}/follow`, { method: 'POST' });
    return handleResponse<{ followed: boolean }>(response);
  },

  unfollowUser: async (userId: string): Promise<{ unfollowed: boolean }> => {
    const response = await fetch(`/api/users/${userId}/unfollow`, { method: 'POST' });
    return handleResponse<{ unfollowed: boolean }>(response);
  },

  isFollowing: async (userId: string): Promise<boolean> => {
    const response = await fetch(`/api/users/${userId}/follow-status`);
    const data = await handleResponse<{ isFollowing: boolean }>(response);
    return data.isFollowing;
  },

  getUserStats: async (userId: string): Promise<{ barsCount: number; followersCount: number; followingCount: number }> => {
    const response = await fetch(`/api/users/${userId}/stats`);
    return handleResponse<{ barsCount: number; followersCount: number; followingCount: number }>(response);
  },

  // Username
  changeUsername: async (username: string): Promise<User> => {
    const response = await fetch('/api/users/me/username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    return handleResponse<User>(response);
  },

  // Password
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await fetch('/api/users/me/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return handleResponse<{ message: string }>(response);
  },

  // Admin
  getAllUsers: async (): Promise<User[]> => {
    const response = await fetch('/api/admin/users');
    return handleResponse<User[]>(response);
  },

  adminDeleteBar: async (barId: string): Promise<{ message: string }> => {
    const response = await fetch(`/api/admin/bars/${barId}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(response);
  },

  adminDeleteAllBars: async (): Promise<{ message: string }> => {
    const response = await fetch('/api/admin/bars', {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(response);
  },

  adminDeleteUser: async (userId: string): Promise<{ message: string }> => {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(response);
  },

  // Notifications
  getNotifications: async (limit = 20): Promise<any[]> => {
    const response = await fetch(`/api/notifications?limit=${limit}`);
    return handleResponse<any[]>(response);
  },

  getUnreadNotificationCount: async (): Promise<{ count: number }> => {
    const response = await fetch('/api/notifications/unread-count');
    return handleResponse<{ count: number }>(response);
  },

  markNotificationRead: async (id: string): Promise<{ success: boolean }> => {
    const response = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    return handleResponse<{ success: boolean }>(response);
  },

  markAllNotificationsRead: async (): Promise<{ success: boolean }> => {
    const response = await fetch('/api/notifications/read-all', { method: 'POST' });
    return handleResponse<{ success: boolean }>(response);
  },
};
