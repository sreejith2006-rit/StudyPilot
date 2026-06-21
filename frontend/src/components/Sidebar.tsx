"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  UploadCloud, 
  MessageSquareCode, 
  Calendar, 
  BookOpenCheck, 
  BarChart3, 
  CalendarClock, 
  LogOut,
  Sparkles,
  FileText
} from "lucide-react";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/upload", label: "Upload Center", icon: UploadCloud },
  { href: "/dashboard/tutor", label: "AI Tutor", icon: MessageSquareCode },
  { href: "/dashboard/summarizer", label: "AI Summarizer", icon: FileText },
  { href: "/dashboard/planner", label: "Study Planner", icon: Calendar },
  { href: "/dashboard/quiz", label: "Quiz Generator", icon: BookOpenCheck },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/revision", label: "Revision Planner", icon: CalendarClock },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    // Clear tokens (skeleton action)
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 border-r border-card-border bg-[rgba(10,10,20,0.4)] backdrop-blur-xl flex flex-col z-30 justify-between p-6">
      <div className="flex flex-col gap-8">
        {/* Brand Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="shrink-0 relative w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-indigo to-primary-violet p-0.5 shadow-lg shadow-primary-indigo/30 overflow-hidden group-hover:scale-105 transition-transform duration-300">
            <img src="/logo.jpg" alt="StudyPilot Logo" className="w-full h-full rounded-[10px] object-cover" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-wider text-white transition-colors group-hover:text-primary-indigo duration-300">STUDYPILOT <span className="text-primary-indigo font-black">AI</span></h1>
            <p className="text-[10px] text-muted-text uppercase font-semibold tracking-widest -mt-1">Study Companion</p>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link key={item.href} href={item.href} className="relative group">
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive 
                      ? "text-white" 
                      : "text-muted-text hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {/* Active Indicator Background */}
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-glow"
                      className="absolute inset-0 bg-gradient-to-r from-primary-indigo/20 to-primary-violet/10 border border-primary-indigo/40 rounded-xl -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  
                  <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${
                    isActive ? "text-primary-indigo" : "text-muted-text group-hover:text-primary-violet"
                  }`} />
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Footer / Logout */}
      <div className="border-t border-card-border/60 pt-4 flex flex-col gap-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-muted-text hover:text-danger hover:bg-danger/10 rounded-xl transition-all duration-300 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}
