import express from "express";
import cors from "cors";
import "./db.js";
import channelsRouter from "./routes/channels.js";
import projectsRouter from "./routes/projects.js";
import sourcesRouter from "./routes/sources.js";
import { STAGES } from "./stages.js";

const app = express();
const PORT = process.env.PORT || 5175;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/api/stages", (req, res) => res.json(STAGES));
app.use("/api/channels", channelsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/sources", sourcesRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

app.listen(PORT, () => {
  console.log(`Second Brain API listening on http://localhost:${PORT}`);
});
