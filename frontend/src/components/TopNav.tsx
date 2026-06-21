"use client";

import { useEffect, useState } from "react";
import { User, Bell, Sparkles, CheckCircle2, Menu } from "lucide-react";

interface UserInfo {
  full_name: string;
  email: string;
}

export default function TopNav() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Load current user from localStorage
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        // Fallback
      }
    }
  }, []);

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Good morning";
    if (hrs < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <header className="h-20 border-b border-card-border bg-[rgba(10,10,20,0.2)] backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          {getGreeting()}, <span className="text-gradient font-extrabold">{user?.full_name || "Scholar"}</span>!
        </h2>
        <p className="text-xs text-muted-text font-medium mt-0.5">Ready to crush your study goals today?</p>
      </div>

      {/* Mobile menu toggle button (visible on small screens) */}
      <button
        className="md:hidden p-2 rounded-md hover:bg-white/[0.05] transition-colors"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle navigation menu"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>
      {/* Desktop and Mobile navigation items */}
      <div className="hidden md:flex items-center gap-4">
        {/* API Status Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/30 text-success text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>System Online</span>
        </div>

        {/* AI Recommendations Notification */}
        <button className="p-2 rounded-xl bg-white/[0.03] border border-card-border hover:bg-white/[0.08] hover:border-primary-indigo/30 transition-all duration-300 text-muted-text hover:text-white cursor-pointer relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-primary-violet border border-background animate-pulse" />
        </button>

        {/* User Card */}
        <div className="flex items-center gap-3 pl-2 border-l border-card-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-indigo to-primary-blue flex items-center justify-center text-white font-bold shadow-lg shadow-primary-indigo/20 border border-white/10 uppercase">
            {user?.full_name ? user.full_name.substring(0, 2) : <User className="w-5 h-5" />}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-white leading-tight">{user?.full_name || "Guest Student"}</p>
            <p className="text-[10px] text-muted-text leading-tight">{user?.email || "not-logged-in@studypilot.ai"}</p>
          </div>
        </div>
      </div>
      {/* Mobile dropdown panel */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-card-bg border-t border-card-border md:hidden" style={{ zIndex: 10 }}>
          <div className="flex flex-col p-4 space-y-3">
            {/* Replicate the hidden user info for mobile */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-indigo to-primary-blue flex items-center justify-center text-white font-bold shadow-lg shadow-primary-indigo/20 border border-white/10 uppercase">
                {user?.full_name ? user.full_name.substring(0, 2) : <User className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{user?.full_name || "Guest Student"}</p>
                <p className="text-[10px] text-muted-text">{user?.email || "not-logged-in@studypilot.ai"}</p>
              </div>
            </div>
            <button className="p-2 rounded-xl bg-white/[0.03] border border-card-border hover:bg-white/[0.08] hover:border-primary-indigo/30 transition-all duration-300 text-muted-text hover:text-white cursor-pointer flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notifications
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
