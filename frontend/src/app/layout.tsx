import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudyPilot AI - Your Personal AI Study Companion",
  description: "Accelerate your learning. Upload notes, previous papers, and syllabi to generate personalized study schedules, revision calendars, and dynamic AI-powered quizzes.",
  keywords: ["AI Study Assistant", "Exam Preparation", "Study Planner", "Spaced Repetition", "Quiz Generator", "Personalized Education"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground bg-gradient-radial min-h-screen relative`}
      >
        {/* Subtle top background glow */}
        <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-radial pointer-events-none z-0" />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
