import { Router } from "express";
import db from "../db.js";

const router = Router();

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM sources WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "source not found" });

  const type = req.body.type ?? existing.type;
  const title = req.body.title ?? existing.title;
  const url = req.body.url ?? existing.url;
  const content = req.body.content ?? existing.content;

  db.prepare("UPDATE sources SET type = ?, title = ?, url = ?, content = ? WHERE id = ?").run(
    type,
    title,
    url,
    content,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM sources WHERE id = ?").get(req.params.id));
});

router.delete("/:id", (req, res) => {
  const info = db.prepare("DELETE FROM sources WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "source not found" });
  res.status(204).end();
});

export default router;
