"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, AlertTriangle, CheckSquare, Plus, Clock, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import api from "@/services/api";

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [weakTopics, setWeakTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Log study hours form state
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [logHours, setLogHours] = useState("");
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [analyticsData, topicsData] = await Promise.all([
        api.analytics.get(),
        api.analytics.getWeakTopics()
      ]);
      setAnalytics(analyticsData);
      setWeakTopics(topicsData);
    } catch (e) {
      console.error("Failed to load analytics", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logDate || !logHours) return;
    const hoursNum = parseFloat(logHours);
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) return;

    setLogging(true);
    try {
      const updated = await api.analytics.logHours(logDate, hoursNum);
      setAnalytics(updated);
      setLogHours("");
    } catch (e) {
      console.error("Failed to log study hours", e);
    } finally {
      setLogging(false);
    }
  };

  const getReadinessGrade = (score: number) => {
    if (score >= 90) return { label: "EXCELLENT", color: "text-success border-success/30 bg-success/10" };
    if (score >= 70) return { label: "GOOD", color: "text-primary-blue border-primary-blue/30 bg-primary-blue/10" };
    if (score >= 50) return { label: "AVERAGE", color: "text-warning border-warning/30 bg-warning/10" };
    return { label: "CRITICAL", color: "text-danger border-danger/30 bg-danger/10" };
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse max-w-4xl mx-auto">
        <div className="h-12 w-64 bg-white/5 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-32 bg-white/5 rounded-xl" />
          <div className="h-32 bg-white/5 rounded-xl" />
          <div className="h-32 bg-white/5 rounded-xl" />
          <div className="h-32 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  const readiness = getReadinessGrade(analytics?.exam_readiness_score || 0);

  return (
    <div className="flex flex-col gap-6 text-white max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">Analytics</h1>
        <p className="text-sm text-muted-text mt-0.5">Track your study volumes, evaluation performance, and real-time exam readiness metrics.</p>
      </div>

      {/* Main Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Readiness */}
        <Card className="bg-gradient-to-tr from-primary-indigo/15 to-transparent">
          <CardHeader className="pb-1">
            <CardDescription className="text-muted-text uppercase font-bold tracking-wider">Exam Readiness</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 flex flex-col gap-1">
            <span className="text-3xl font-black text-white">{analytics?.exam_readiness_score?.toFixed(0) || 0}%</span>
            <span className={`text-[9px] w-fit font-extrabold px-1.5 py-0.5 rounded border uppercase ${readiness.color}`}>
              {readiness.label}
            </span>
          </CardContent>
        </Card>

        {/* Study Hours Total */}
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="text-muted-text uppercase font-bold tracking-wider">Total logged Hours</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">
              {analytics?.study_hours?.reduce((acc: number, cur: any) => acc + cur.hours, 0).toFixed(1) || "0.0"}
            </span>
            <span className="text-[10px] text-muted-text uppercase font-bold">Hours</span>
          </CardContent>
        </Card>

        {/* Quizzes Attempted */}
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="text-muted-text uppercase font-bold tracking-wider">Quizzes Completed</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{analytics?.quizzes_attempted || 0}</span>
            <span className="text-[10px] text-muted-text uppercase font-bold">Attempts</span>
          </CardContent>
        </Card>

        {/* Weak Topics */}
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="text-muted-text uppercase font-bold tracking-wider">Weak Areas</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{analytics?.weak_topics_count || 0}</span>
            <span className="text-[10px] text-muted-text uppercase font-bold">Topics</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Study Log Logger & Chart */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Mock Study Hours Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Study Calendar Hours</CardTitle>
              <CardDescription>Log and analyze daily review volumes</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {analytics?.study_hours?.length > 0 ? (
                <div className="h-48 flex items-end justify-around gap-2.5 border-b border-white/[0.06] pb-2">
                  {analytics.study_hours.slice(-7).map((item: any, i: number) => {
                    const maxHours = Math.max(...analytics.study_hours.map((h: any) => h.hours), 1);
                    const heightPercent = (item.hours / maxHours) * 80; // Scale to max 80% height
                    // Append T00:00:00 to prevent timezone offsets shifting dates
                    const formattedDate = new Date(item.date + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric" });
                    
                    return (
                      <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group">
                        <span className="text-[10px] font-bold text-primary-indigo mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.hours}h
                        </span>
                        <div 
                          className="w-full bg-gradient-to-t from-primary-indigo/60 to-primary-violet rounded-t-lg transition-all duration-500 hover:from-primary-indigo hover:to-primary-violet"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="text-[9px] text-muted-text font-bold mt-2 truncate w-full text-center">
                          {formattedDate}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center border-b border-white/[0.06] pb-2">
                  <p className="text-xs text-muted-text">No hours logged yet. Use the sidebar tool below.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form to Log Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-indigo" />
                Log Daily Study Hours
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleLogHours}>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-0">
                <Input
                  label="Log Date"
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  required
                />
                <Input
                  label="Hours Spent studying"
                  type="number"
                  placeholder="e.g. 2.5"
                  value={logHours}
                  onChange={(e) => setLogHours(e.target.value)}
                  min="0.5"
                  max="24"
                  step="0.5"
                  required
                />
              </CardContent>
              <div className="p-6 pt-0 flex justify-end">
                <Button variant="primary" type="submit" size="sm" disabled={logging}>
                  Log Session
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Sidebar Analytics */}
        <div className="flex flex-col gap-6">
          {/* Weak Topics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Focus Topics</CardTitle>
              <CardDescription>Topics needing review based on quiz statistics</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              {weakTopics.length > 0 ? (
                weakTopics.map((topic, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white max-w-[150px] truncate">{topic.topic_name}</span>
                      <span className="px-2 py-0.5 rounded bg-danger/10 border border-danger/20 text-danger text-[9px] font-black uppercase">
                        {topic.confidence_level}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-text">
                      <span>Quiz Accuracy: {topic.quiz_accuracy?.toFixed(0) || 0}%</span>
                      <span>Occurrences: {topic.occurrences}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-xs text-muted-text">No topic deficiencies identified yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
