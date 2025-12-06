import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { getApiBaseUrl } from "../api";

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_CACHE_KEY = "user_data";
const USER_ID_KEY = "user_id";
const CACHE_TIMESTAMP_KEY = "user_cache_timestamp";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCachedUser(): User | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(USER_CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

    if (!cached || !timestamp) return null;

    // Check if cache is expired
    const cacheAge = Date.now() - parseInt(timestamp, 10);
    if (cacheAge > CACHE_DURATION) {
      // Cache expired, clear it
      clearUserCache();
      return null;
    }

    return JSON.parse(cached);
  } catch (error) {
    console.error("Failed to parse cached user:", error);
    return null;
  }
}

function cacheUser(user: User | null) {
  if (typeof window === "undefined") return;

  try {
    if (user) {
      const previousUserId = localStorage.getItem(USER_ID_KEY);

      // If user ID changed, different user logged in - clear old cache
      if (previousUserId && previousUserId !== user.id) {
        console.log("User changed, clearing old cache");
        clearUserCache();
      }

      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
      localStorage.setItem(USER_ID_KEY, user.id);
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } else {
      clearUserCache();
    }
  } catch (error) {
    console.error("Failed to cache user:", error);
  }
}

function clearUserCache() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(USER_CACHE_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(CACHE_TIMESTAMP_KEY);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getCachedUser);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        cacheUser(userData);
      } else {
        setUser(null);
        cacheUser(null);
      }
    } catch (error) {
      console.error("Failed to load user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();

    // Refresh user data when tab becomes visible (detects token changes)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchUser();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
