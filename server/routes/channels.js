import { Router } from "express";
import db from "../db.js";

const router = Router();

router.get("/", (req, res) => {
  const channels = db.prepare("SELECT * FROM channels ORDER BY name COLLATE NOCASE").all();
  res.json(channels);
});

router.post("/", (req, res) => {
  const { name, handle = null, url = null, subscriber_count = null, notes = null } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "name is required" });

  const info = db
    .prepare(
      "INSERT INTO channels (name, handle, url, subscriber_count, notes) VALUES (?, ?, ?, ?, ?)"
    )
    .run(name.trim(), handle, url, subscriber_count, notes);
  const channel = db.prepare("SELECT * FROM channels WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(channel);
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM channels WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "channel not found" });

  const name = req.body.name?.trim() || existing.name;
  const handle = req.body.handle ?? existing.handle;
  const url = req.body.url ?? existing.url;
  const subscriber_count = req.body.subscriber_count ?? existing.subscriber_count;
  const notes = req.body.notes ?? existing.notes;

  db.prepare(
    "UPDATE channels SET name = ?, handle = ?, url = ?, subscriber_count = ?, notes = ? WHERE id = ?"
  ).run(name, handle, url, subscriber_count, notes, req.params.id);
  res.json(db.prepare("SELECT * FROM channels WHERE id = ?").get(req.params.id));
});

router.delete("/:id", (req, res) => {
  const info = db.prepare("DELETE FROM channels WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "channel not found" });
  res.status(204).end();
});

export default router;
