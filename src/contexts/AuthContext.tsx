import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ error: string | null, user?: User | null }>;
  logout: () => Promise<void>;
  updateUser: (userData: User) => void;
  isAuthenticated: boolean;
  hasRole: (roles: (UserRole | string)[]) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ error: string | null, user?: User | null }> => {
    try {
      const response = await api.post('/api/login', { email, password });
      
      if (response.token && response.user) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);

        // Update user's real-time location upon successful login
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                await api.put('/api/user/location', {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                });
                console.log('Location updated successfully upon login');
              } catch (locErr) {
                console.error('Failed to update location:', locErr);
              }
            },
            (error) => {
              console.warn('Geolocation error during login:', error.message);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        }

        return { error: null, user: response.user };
      }
      
      return { error: 'Terjadi kesalahan saat login' };
    } catch (err: any) {
      return { error: err.message || 'Email atau password salah' };
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/logout', {});
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const hasRole = (roles: (UserRole | string)[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
        hasRole,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
