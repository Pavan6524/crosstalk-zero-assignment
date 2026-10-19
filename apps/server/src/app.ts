import cors from "cors";
import express from "express";

export function createApp(clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173") {
  const app = express();
  app.use(cors({ origin: clientOrigin }));
  app.use(express.json());
  app.get("/health", (_request, response) => response.json({ status: "ok" }));
  return app;
}
