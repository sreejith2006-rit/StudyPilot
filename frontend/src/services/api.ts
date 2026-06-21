const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function getHeaders(isMultipart = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

async function handleResponse(response: Response) {
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    throw new Error("Not authenticated");
  }
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Something went wrong");
  }
  return data;
}

export const api = {
  // Authentication
  auth: {
    async signup(userData: any) {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(userData),
      });
      const data = await handleResponse(res);
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      return data;
    },
    async login(credentials: any) {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(credentials),
      });
      const data = await handleResponse(res);
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      return data;
    },
    async getMe() {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Document Upload Center
  documents: {
    async list() {
      const res = await fetch(`${API_BASE_URL}/documents/`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    async upload(file: File) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: "POST",
        headers: getHeaders(true),
        body: formData,
      });
      return handleResponse(res);
    },
    async delete(id: string) {
      const res = await fetch(`${API_BASE_URL}/documents/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    async summarize(id: string, force = false) {
      const url = new URL(`${API_BASE_URL}/documents/${id}/summarize`);
      if (force) {
        url.searchParams.append("force", "true");
      }
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Study Planner
  plans: {
    async getActive() {
      const res = await fetch(`${API_BASE_URL}/plans/active`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    async generate(planData: { exam_date: string; daily_study_hours: number; subjects: string[] }) {
      const res = await fetch(`${API_BASE_URL}/plans/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(planData),
      });
      return handleResponse(res);
    },
    async updateTask(dateKey: string, taskId: string, completed: boolean) {
      const url = new URL(`${API_BASE_URL}/plans/active/tasks`);
      url.searchParams.append("date_key", dateKey);
      url.searchParams.append("task_id", taskId);
      url.searchParams.append("completed", String(completed));
      
      const res = await fetch(url.toString(), {
        method: "PUT",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Quiz Generator
  quizzes: {
    async generate(quizData: { document_id?: string; type: string; num_questions: number; topic?: string }) {
      const res = await fetch(`${API_BASE_URL}/quizzes/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(quizData),
      });
      return handleResponse(res);
    },
    async submitAttempt(quizId: string, answers: { question_id: number; answer: string }[]) {
      const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}/attempt`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ answers }),
      });
      return handleResponse(res);
    },
    async listAttempts() {
      const res = await fetch(`${API_BASE_URL}/quizzes/attempts`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Analytics Tracker
  analytics: {
    async get() {
      const res = await fetch(`${API_BASE_URL}/analytics/`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    async logHours(date: string, hours: number) {
      const res = await fetch(`${API_BASE_URL}/analytics/study-hours`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ date, hours }),
      });
      return handleResponse(res);
    },
    async getWeakTopics() {
      const res = await fetch(`${API_BASE_URL}/analytics/weak-topics`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Revision Planner
  revision: {
    async list() {
      const res = await fetch(`${API_BASE_URL}/revision/`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    async generate(studyPlanId: string, topicsToRevise: string[]) {
      const res = await fetch(`${API_BASE_URL}/revision/generate`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ study_plan_id: studyPlanId, topics_to_revise: topicsToRevise }),
      });
      return handleResponse(res);
    },
  },

  // AI Tutor
  tutor: {
    async ask(question: string) {
      const res = await fetch(`${API_BASE_URL}/tutor/ask`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ question }),
      });
      return handleResponse(res);
    },
  },
};
export default api;
