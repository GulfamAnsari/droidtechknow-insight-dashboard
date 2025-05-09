
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";
import Cookies from "js-cookie";

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

  // Check if the user is already logged in when the app loads
  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse user data:', error);
        sessionStorage.removeItem('user');
        Cookies.remove('auth_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('https://droidtechknow.com/admin/api/auth/signin.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
        },
        body: JSON.stringify({ username, password }),
      });

      const { auth_token, data } = await response.json();
      
      if (data.success) {
        // Store the token in cookies
        Cookies.set('Cookie', auth_token, { expires: 7 }); // 7 days expiry
        // Store the user data in sessionStorage
        sessionStorage.setItem('user', JSON.stringify(data));
        setUser(data);
        
        toast.success('Successfully logged in!');
        return true;
      } else {
        toast.error(data.message || 'Login failed. Please check your credentials.');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (username: string, email: string, password: string, role: string = 'user', key: string = ''): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('https://droidtechknow.com/admin/api/auth/signup.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
        },
        body: JSON.stringify({ 
          username, 
          password, 
          email, 
          role,
          key
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Account created successfully! Please log in.');
        return true;
      } else {
        toast.error(data.message || 'Registration failed. Please try again.');
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

  const logout = () => {
    sessionStorage.removeItem('user');
    Cookies.remove('Cookie');
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
