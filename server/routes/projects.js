import { Router } from "express";
import db from "../db.js";
import { STAGES } from "../stages.js";

const router = Router();

function serializeProject(row) {
  return { ...row, tags: row.tags ? row.tags.split(",").filter(Boolean) : [] };
}

router.get("/", (req, res) => {
  const { stage, channel_id, tag } = req.query;
  let sql = "SELECT * FROM projects";
  const clauses = [];
  const params = [];

  if (stage) {
    clauses.push("stage = ?");
    params.push(stage);
  }
  if (channel_id) {
    clauses.push("channel_id = ?");
    params.push(channel_id);
  }
  if (tag) {
    clauses.push("(',' || tags || ',') LIKE ?");
    params.push(`%,${tag},%`);
  }
  if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
  sql += " ORDER BY updated_at DESC";

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(serializeProject));
});

router.post("/", (req, res) => {
  const { title, summary = null, channel_id = null, tags = [], stage = "idea" } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: "title is required" });
  if (!STAGES.includes(stage)) return res.status(400).json({ error: `stage must be one of ${STAGES.join(", ")}` });

  const tagsStr = Array.isArray(tags) ? tags.map((t) => t.trim()).filter(Boolean).join(",") : "";

  const info = db
    .prepare(
      "INSERT INTO projects (title, summary, channel_id, tags, stage) VALUES (?, ?, ?, ?, ?)"
    )
    .run(title.trim(), summary, channel_id, tagsStr, stage);

  db.prepare("INSERT INTO scripts (project_id) VALUES (?)").run(info.lastInsertRowid);

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(serializeProject(project));
});

router.get("/:id", (req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "project not found" });

  const script = db.prepare("SELECT * FROM scripts WHERE project_id = ?").get(req.params.id);
  const sources = db
    .prepare("SELECT * FROM sources WHERE project_id = ? ORDER BY created_at DESC")
    .all(req.params.id);

  res.json({ ...serializeProject(project), script: script || null, sources });
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "project not found" });

  const title = req.body.title?.trim() || existing.title;
  const summary = req.body.summary ?? existing.summary;
  const channel_id = req.body.channel_id !== undefined ? req.body.channel_id : existing.channel_id;
  const tags = req.body.tags !== undefined
    ? (Array.isArray(req.body.tags) ? req.body.tags.map((t) => t.trim()).filter(Boolean).join(",") : "")
    : existing.tags;
  const stage = req.body.stage ?? existing.stage;
  if (!STAGES.includes(stage)) return res.status(400).json({ error: `stage must be one of ${STAGES.join(", ")}` });

  db.prepare(
    "UPDATE projects SET title = ?, summary = ?, channel_id = ?, tags = ?, stage = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(title, summary, channel_id, tags, stage, req.params.id);

  res.json(serializeProject(db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id)));
});

router.patch("/:id/stage", (req, res) => {
  const { stage } = req.body;
  if (!STAGES.includes(stage)) return res.status(400).json({ error: `stage must be one of ${STAGES.join(", ")}` });

  const info = db
    .prepare("UPDATE projects SET stage = ?, updated_at = datetime('now') WHERE id = ?")
    .run(stage, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "project not found" });

  res.json(serializeProject(db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id)));
});

router.delete("/:id", (req, res) => {
  const info = db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "project not found" });
  res.status(204).end();
});

router.put("/:id/script", (req, res) => {
  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "project not found" });

  const { hook = "", body = "", cta = "" } = req.body;
  const existing = db.prepare("SELECT id FROM scripts WHERE project_id = ?").get(req.params.id);
  if (existing) {
    db.prepare(
      "UPDATE scripts SET hook = ?, body = ?, cta = ?, updated_at = datetime('now') WHERE project_id = ?"
    ).run(hook, body, cta, req.params.id);
  } else {
    db.prepare(
      "INSERT INTO scripts (project_id, hook, body, cta) VALUES (?, ?, ?, ?)"
    ).run(req.params.id, hook, body, cta);
  }
  db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(req.params.id);

  res.json(db.prepare("SELECT * FROM scripts WHERE project_id = ?").get(req.params.id));
});

router.get("/:id/sources", (req, res) => {
  const sources = db
    .prepare("SELECT * FROM sources WHERE project_id = ? ORDER BY created_at DESC")
    .all(req.params.id);
  res.json(sources);
});

router.post("/:id/sources", (req, res) => {
  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "project not found" });

  const { type = "link", title = null, url = null, content = null } = req.body;
  const info = db
    .prepare(
      "INSERT INTO sources (project_id, type, title, url, content) VALUES (?, ?, ?, ?, ?)"
    )
    .run(req.params.id, type, title, url, content);

  res.status(201).json(db.prepare("SELECT * FROM sources WHERE id = ?").get(info.lastInsertRowid));
});

export default router;
