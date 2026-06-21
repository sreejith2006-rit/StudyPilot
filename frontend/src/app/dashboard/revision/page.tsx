"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Sparkles, RefreshCw, CheckCircle2, ChevronRight, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import api from "@/services/api";

export default function RevisionPlannerPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [weakTopics, setWeakTopics] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadRevisionData();
  }, []);

  const loadRevisionData = async () => {
    setLoading(true);
    try {
      const [schedulesData, planData, topicsData] = await Promise.allSettled([
        api.revision.list(),
        api.plans.getActive(),
        api.analytics.getWeakTopics()
      ]);

      if (schedulesData.status === "fulfilled") setSchedules(schedulesData.value);
      if (planData.status === "fulfilled") setActivePlan(planData.value);
      if (topicsData.status === "fulfilled") setWeakTopics(topicsData.value);
    } catch (e) {
      console.error("Failed to load revision planner data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSchedule = async () => {
    if (!activePlan) return;
    setGenerating(true);
    
    // Choose weak topics to focus on, or fallback to subjects if none
    const focusTopics = weakTopics.length > 0 
      ? weakTopics.map(t => t.topic_name) 
      : activePlan.subjects;

    try {
      const newSchedule = await api.revision.generate(activePlan._id, focusTopics);
      setSchedules([newSchedule, ...schedules]);
    } catch (e) {
      console.error("Failed to generate revision schedule", e);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse max-w-4xl mx-auto">
        <div className="h-12 w-64 bg-white/5 rounded-xl" />
        <div className="h-96 bg-white/5 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-white max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">Revision Planner</h1>
        <p className="text-sm text-muted-text mt-0.5">Retain knowledge long-term. Generate active spaced-repetition schedules focused on target subjects.</p>
      </div>

      {!activePlan ? (
        <Card className="text-center p-12">
          <CardContent className="flex flex-col items-center">
            <div className="p-4 rounded-full bg-white/[0.02] border border-white/5 text-primary-indigo mb-4">
              <CalendarClock className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg text-white">No Active Study Plan Found</h3>
            <p className="text-xs text-muted-text max-w-xs mt-2 leading-relaxed">
              Before setting up revision schedules, you must configure a primary exam schedule in the Study Planner.
            </p>
            <Button variant="primary" size="sm" className="mt-6 font-bold" onClick={() => window.location.href = "/dashboard/planner"}>
              Build Study Plan
            </Button>
          </CardContent>
        </Card>
      ) : schedules.length === 0 ? (
        /* Setup Call to Action */
        <Card className="max-w-2xl mx-auto w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-indigo" />
              Configure Spaced Repetition Schedule
            </CardTitle>
            <CardDescription>
              We'll automatically set up revision cycles spaced out at optimal intervals (e.g. 1 day, 3 days, 7 days) to reinforce core knowledge.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-4">
            {weakTopics.length > 0 ? (
              <div className="p-4 rounded-xl bg-warning/5 border border-warning/10 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Focus on Weak Subjects</h4>
                  <p className="text-[11px] text-muted-text mt-1 leading-relaxed">
                    AI detected {weakTopics.length} weak areas from your quiz sessions. We will prioritize these topics during spacing.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex gap-3 text-xs leading-relaxed text-muted-text">
                No weak topics found yet. We will distribute revision equally across all your course subjects: {activePlan.subjects.join(", ")}.
              </div>
            )}
            
            <div className="flex justify-end pt-4 border-t border-white/[0.04]">
              <Button variant="primary" onClick={handleGenerateSchedule} disabled={generating}>
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating Cycles...
                  </>
                ) : (
                  "Generate Revision Cycles"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Schedule Viewer */
        <div className="space-y-6">
          {schedules.map((schedule) => (
            <Card key={schedule._id}>
              <CardHeader className="flex flex-row items-center justify-between border-b border-white/[0.04] pb-4">
                <div>
                  <CardTitle className="text-base">Spaced Repetition Calendar</CardTitle>
                  <CardDescription>Focus topics: {schedule.weak_topics_focused.join(", ")}</CardDescription>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-indigo/10 border border-primary-indigo/25 text-primary-indigo text-[10px] font-bold uppercase">
                  {schedule.status}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {schedule.revision_dates.map((dateStr: string, idx: number) => {
                    const formatted = new Date(dateStr + "T00:00:00").toLocaleDateString([], { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    });
                    const dayLabels = ["Review 1 (1 Day Later)", "Review 2 (3 Days Later)", "Review 3 (7 Days Later)"];
                    
                    // Fetch the tasks for this date from the revision_plan object
                    const dateKey = typeof dateStr === 'string' ? dateStr.split("T")[0] : "";
                    const tasks = schedule.revision_plan?.[dateKey] || schedule.revision_plan?.[dateStr] || [];
                    
                    return (
                      <div 
                        key={idx}
                        className="p-5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-3 relative overflow-hidden group hover:border-primary-indigo/30 transition-all duration-300"
                      >
                        <span className="text-[9px] uppercase tracking-widest text-primary-violet font-extrabold">
                          {dayLabels[idx] || `Review ${idx + 1}`}
                        </span>
                        <h4 className="text-sm font-bold text-white border-b border-white/[0.05] pb-2">{formatted}</h4>
                        
                        <div className="flex flex-col gap-2 flex-1 mt-1">
                          {tasks.map((task: string, tIdx: number) => (
                            <div key={tIdx} className="text-xs text-muted-text flex items-start gap-1.5 leading-relaxed">
                              <span className="text-primary-indigo font-bold mt-0.5">•</span>
                              <span>{task}</span>
                            </div>
                          ))}
                          {tasks.length === 0 && (
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-text mt-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                              <span>Topics scheduled for review</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>

            </Card>
          ))}
          <Button variant="secondary" onClick={handleGenerateSchedule} className="font-bold w-full mt-4">
            Re-generate Spaced Calendar
          </Button>
        </div>
      )}
    </div>
  );
}
