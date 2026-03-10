"use client";

import { createContext, useContext } from "react";

interface UserContextValue {
  userId: string;
  username: string;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({
  userId,
  username,
  children,
}: UserContextValue & { children: React.ReactNode }) {
  return (
    <UserContext.Provider value={{ userId, username }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue | null {
  return useContext(UserContext);
}
