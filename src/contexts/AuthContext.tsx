
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import httpClient from "@/utils/httpClient";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (username: string, email: string, password: string, role?: string, key?: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // First check localStorage for existing user
        const storedUser = localStorage.getItem('user');
        const userId = Cookies.get('userId');
        if (storedUser && userId) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (error) {
            console.error('Failed to parse user data:', error);
            localStorage.removeItem('user');
            Cookies.remove('Cookie');
            Cookies.remove('userId');
          }
        }

        // Also check server-side session (for Google OAuth)
        const response = await fetch('https://droidtechknow.com/admin/api/auth/google-auth.php?route=check-auth', {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            // Store server auth data in localStorage and cookies
            Cookies.set('Cookie', data.auth_token, { expires: 30 });
            Cookies.set('userId', data.data.id, { expires: 30 });
            localStorage.setItem('user', JSON.stringify(data.data));
            setUser(data.data);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Use httpClient for login request with skipAuth as we don't have auth yet
      const response = await httpClient.post('https://droidtechknow.com/admin/api/auth/signin.php', 
        { username, password },
        { 
          skipAuth: true,
          headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
          }
        }
      );
      
      console.log('Login response:', response);
      
      // Handle both success formats from the API response
      const { auth_token, data, success, message } = response;
      
      if (success === "success" || success === true) {
        // Store the token in cookies
        Cookies.set('Cookie', auth_token, { expires: 7 }); // 7 days expiry
        // Store the user ID in cookies
        Cookies.set('userId', data.id, { expires: 7 }); // 7 days expiry
        
        // Store the user data in localStorage
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
        
        toast.success(message || 'Successfully logged in!');
        return true;
      } else {
        toast.error(message || 'Login failed. Please check your credentials.');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      // For Google OAuth, if login fails with email, it means user doesn't exist
      if (username.includes('@') && password === "google_oauth_temp") {
        console.log('User not found for Google OAuth, will redirect to signup');
        return false;
      }
      toast.error('An error occurred during login. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (username: string, email: string, password: string, role: string = 'user', key: string = ''): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Use httpClient for signup request with skipAuth as we don't have auth yet
      const response = await httpClient.post('https://droidtechknow.com/admin/api/auth/signup.php', 
        { username, password, email, role, key },
        { 
          skipAuth: true,
          headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
          }
        }
      );
      
      if (response.success) {
        toast.success('Account created successfully! Please log in.');
        return true;
      } else {
        toast.error(response.message || 'Registration failed. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('An error occurred during registration. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear server-side session
      await fetch('https://droidtechknow.com/admin/api/auth/google-auth.php?route=logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Server logout error:', error);
    }
    
    // Clear client-side data
    localStorage.removeItem('user');
    Cookies.remove('Cookie');
    Cookies.remove('userId');
    setUser(null);
    toast.info('You have been logged out.');
  };

  const isAuthenticated = () => {
    return user !== null;
  };

  const value = {
    user,
    isLoading,
    login,
    signup,
    logout,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
