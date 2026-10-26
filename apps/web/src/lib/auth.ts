export interface User {
  id: number;
  email: string;
  fullName: string | null;
  loyaltyPoints: number;
  createdAt?: string;
}

const TOKEN_KEY = 'brewlite_access_token';
const USER_KEY = 'brewlite_user';

export const saveAuthData = (token: string, user: User) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
};

export const getStoredUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
  return null;
};

export const clearAuthData = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};


export const updateStoredUserPoints = (newPoints: number) => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return;
    try {
      const user = JSON.parse(raw) as User;
      user.loyaltyPoints = newPoints;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  }
};
