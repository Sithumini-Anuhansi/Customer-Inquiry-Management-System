import "dotenv/config";
import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "inquiry-api" });
});

const port = Number(process.env.API_PORT || 4000);
app.listen(port, () => {
  console.log(`Inquiry API listening on http://localhost:${port}`);
});
