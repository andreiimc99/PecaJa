'use client';

import React from 'react';
import { UserProvider } from './UserContext'; // caminho correto

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return <UserProvider>{children}</UserProvider>;
}
