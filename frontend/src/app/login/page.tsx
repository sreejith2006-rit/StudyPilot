"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Lock, Mail } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import api from "@/services/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    
    setError("");
    setLoading(true);

    try {
      await api.auth.login({ email, password });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-indigo/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-violet/10 blur-3xl rounded-full pointer-events-none" />

      <Card className="w-full max-w-md bg-[rgba(15,15,30,0.8)] border border-white/10 shadow-2xl relative z-10">
        <CardHeader className="text-center">
          <div className="mx-auto shrink-0 relative w-12 h-12 rounded-xl bg-gradient-to-tr from-primary-indigo to-primary-violet p-0.5 shadow-lg shadow-primary-indigo/30 overflow-hidden mb-3">
            <img src="/logo.jpg" alt="StudyPilot Logo" className="w-full h-full rounded-[10px] object-cover" />
          </div>
          <CardTitle className="text-2xl font-extrabold text-white tracking-tight">Welcome Back</CardTitle>
          <CardDescription>Login to access your personal AI study companion</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs font-semibold text-center">
                {error}
              </div>
            )}
            
            <div className="space-y-1">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            
            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button variant="primary" type="submit" className="w-full font-bold group" disabled={loading}>
              {loading ? "Logging in..." : "Log In"}
              {!loading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
            </Button>
            <p className="text-xs text-muted-text text-center">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary-indigo hover:text-primary-violet font-semibold transition-colors">
                Sign Up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
