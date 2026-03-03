import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ──────────────────────────────────────────────────────────
// Roluri disponibile în aplicație (conform documentului de proiect)
// ──────────────────────────────────────────────────────────
export type UserRole = "admin" | "dispecer" | "hr" | "contabil";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

// ──────────────────────────────────────────────────────────
// Utilizatori simulați — studenții pot extinde această listă
// ──────────────────────────────────────────────────────────
const MOCK_USERS: AuthUser[] = [
  {
    id: "1",
    name: "Admin Transmarin",
    email: "admin@transmarin.ro",
    role: "admin",
    avatar: "/avatars/admin.jpg",
  },
  {
    id: "2",
    name: "Ion Popescu",
    email: "dispecer@transmarin.ro",
    role: "dispecer",
    avatar: "/avatars/dispecer.jpg",
  },
  {
    id: "3",
    name: "Maria Ionescu",
    email: "hr@transmarin.ro",
    role: "hr",
    avatar: "/avatars/hr.jpg",
  },
  {
    id: "4",
    name: "Elena Dumitrescu",
    email: "contabil@transmarin.ro",
    role: "contabil",
    avatar: "/avatars/contabil.jpg",
  },
];

// ──────────────────────────────────────────────────────────
// Permisiuni pe module — ce module poate accesa fiecare rol
// ──────────────────────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ["transport", "fleet", "accounting", "hr", "reports"],
  dispecer: ["transport", "reports"],
  hr: ["hr", "reports"],
  contabil: ["accounting", "reports"],
};

// ──────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────
interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  loginAs: (role: UserRole) => void;
  logout: () => void;
  hasAccess: (module: string) => boolean;
}

const AUTH_STORAGE_KEY = "transmarin_auth_user";
const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);

  const login = useCallback((email: string, _password: string): boolean => {
    // Autentificare simulată — orice parolă e acceptată
    const found = MOCK_USERS.find((u) => u.email === email);
    if (!found) return false;
    setUser(found);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(found));
    return true;
  }, []);

  const loginAs = useCallback((role: UserRole) => {
    const found = MOCK_USERS.find((u) => u.role === role);
    if (!found) return;
    setUser(found);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(found));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const hasAccess = useCallback(
    (module: string): boolean => {
      if (!user) return false;
      return ROLE_PERMISSIONS[user.role].includes(module);
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      loginAs,
      logout,
      hasAccess,
    }),
    [user, login, loginAs, logout, hasAccess],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { MOCK_USERS };
