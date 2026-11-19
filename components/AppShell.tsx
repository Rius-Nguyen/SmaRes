"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const shouldHideChrome =
    pathname?.startsWith('/kds') ||
    pathname?.startsWith('/table-menu') ||
    pathname?.startsWith('/admin');

  return (
    <div className="flex flex-col min-h-screen flex-1">
      {!shouldHideChrome && <Navbar />}
      <div className="flex-1">{children}</div>
      {!shouldHideChrome && <Footer />}
    </div>
  );
}
