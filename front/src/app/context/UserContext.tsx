"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import storage from "../lib/storage";

type User = {
  id?: number;
  nome: string;
  email?: string;
  role?: string;
};

type UserContextType = {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = storage.getJSON<User>("usuario");
    if (stored) setUser(stored);
  }, []);

  const login = (user: User) => {
    // Mescla com qualquer objeto já armazenado para preservar role (ex: admin)
    const existing = storage.getJSON<any>("usuario") || {};
    const merged = { ...existing, ...user };
    storage.setJSON("usuario", merged);
    setUser(merged as User);
  };

  const logout = () => {
    storage.remove("usuario");
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser deve ser usado dentro de um UserProvider");
  }
  return context;
};
