import "dotenv/config";
import cors from "cors";
import express from "express";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get("/api/cards", (_req, res) => {
  type Card = { id: number; title: string; body: string };

  const cards: Card[] = [
    { id: 1, title: "Sample card", body: "Replace this demo data with your own." },
    { id: 2, title: "Stack ready", body: "Backend is split from frontend; extend routes as needed." },
  ];

  res.json(cards);
});

const port = Number(process.env.PORT) || 4000;

app.listen(port, () => {
  console.log(`[backend] API server running on http://localhost:${port}`);
});
