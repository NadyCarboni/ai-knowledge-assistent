import { configDotenv } from "dotenv";
import { createServer } from "node:http";
import { GoogleGenAI } from "@google/genai";

configDotenv();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY não está configurada.");
}

const client = new GoogleGenAI({ apiKey });

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (req.method === "POST" && req.url === "/chat") {
    const chunks: Buffer[] = [];

    req.on("data", (chunk) => {
      chunks.push(chunk);
    });

    req.on("end", async () => {
      const body = Buffer.concat(chunks).toString("utf-8");
      let parsedBody: unknown;

      try {
        parsedBody = JSON.parse(body);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }

      const message =
        typeof parsedBody === "object" && parsedBody !== null && "message" in parsedBody
          ? parsedBody.message
          : undefined;

      if (typeof message !== "string" || message.trim() === "") {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "message must be a non-empty string" }));
        return;
      }

      try {
        const generated = await client.models.generateContent({
          model: process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
          contents: message.trim(),
        });

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ reply: generated.text ?? "" }));
      } catch (error) {
        console.error("Gemini request failed:", error);
        res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "Could not generate a response" }));
      }
    });

    return;
  }


  res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ status: "not found" }));
});

const PORT = 3001;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
