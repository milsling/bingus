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

  getCurrentUser: async (): Promise<User> => {
    const response = await fetch('/api/auth/user');
    return handleResponse<User>(response);
  },

  // Bars
  getBars: async (limit = 50): Promise<BarWithUser[]> => {
    const response = await fetch(`/api/bars?limit=${limit}`);
    return handleResponse<BarWithUser[]>(response);
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

  adminDeleteUser: async (userId: string): Promise<{ message: string }> => {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(response);
  },
};
