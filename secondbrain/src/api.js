const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  stages: () => request("/stages"),

  listProjects: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/projects${qs ? `?${qs}` : ""}`);
  },
  getProject: (id) => request(`/projects/${id}`),
  createProject: (data) => request("/projects", { method: "POST", body: JSON.stringify(data) }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  setProjectStage: (id, stage) =>
    request(`/projects/${id}/stage`, { method: "PATCH", body: JSON.stringify({ stage }) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: "DELETE" }),

  saveScript: (id, data) => request(`/projects/${id}/script`, { method: "PUT", body: JSON.stringify(data) }),

  addSource: (projectId, data) =>
    request(`/projects/${projectId}/sources`, { method: "POST", body: JSON.stringify(data) }),
  updateSource: (id, data) => request(`/sources/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSource: (id) => request(`/sources/${id}`, { method: "DELETE" }),

  listChannels: () => request("/channels"),
  createChannel: (data) => request("/channels", { method: "POST", body: JSON.stringify(data) }),
  updateChannel: (id, data) => request(`/channels/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteChannel: (id) => request(`/channels/${id}`, { method: "DELETE" }),
};
