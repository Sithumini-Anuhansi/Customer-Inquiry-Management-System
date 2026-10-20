import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { authRouter } from "./auth.js";
import { inquiriesRouter } from "./inquiries.js";

export const app = express();

app.use(cors({ origin: process.env.WEB_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "inquiry-api" });
});
app.use("/api/auth", authRouter);
app.use("/api/inquiries", inquiriesRouter);

app.use((_request, response) => response.status(404).json({ error: "Endpoint was not found." }));
app.use((error, _request, response, _next) => {
  if (error.type === "entity.parse.failed") return response.status(400).json({ error: "Request body must contain valid JSON." });
  if (error.type === "entity.too.large") return response.status(413).json({ error: "Request body is too large." });
  console.error(error);
  return response.status(500).json({ error: "An unexpected server error occurred." });
});
