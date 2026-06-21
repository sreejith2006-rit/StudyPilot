"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-indigo" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative flex">
      {/* Background glow meshes */}
      <div className="absolute top-0 right-0 w-[50%] h-[600px] bg-gradient-radial from-primary-violet/10 via-transparent to-transparent pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-64 w-[50%] h-[500px] bg-gradient-radial from-primary-blue/5 via-transparent to-transparent pointer-events-none -z-10" />
      
      {/* Sidebar navigation */}
      <Sidebar />
      
      {/* Main dashboard content area */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        <TopNav />
        <main className="flex-1 p-8 z-10 relative overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
