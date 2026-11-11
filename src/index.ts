import { configDotenv } from "dotenv";
import { createServer } from "node:http";
import { GoogleGenAI, type Content } from "@google/genai";

configDotenv();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY não está configurada.");
}

const client = new GoogleGenAI({
    apiKey,
    httpOptions: {
        timeout: 30_000,
        retryOptions: { attempts: 2 },
    },
});

const sessions = new Map<string, Content[]>();

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
        res.writeHead(400, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }

      const message =
        typeof parsedBody === "object" &&
        parsedBody !== null &&
        "message" in parsedBody
          ? parsedBody.message
          : undefined;

      const sessionId =
        typeof parsedBody === "object" &&
        parsedBody !== null &&
        "sessionId" in parsedBody
          ? parsedBody.sessionId
          : undefined;

      if (typeof message !== "string" || message.trim() === "") {
        res.writeHead(400, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(
          JSON.stringify({ error: "message must be a non-empty string" }),
        );
        return;
      }

      if (typeof sessionId !== "string" || sessionId.trim() === "") {
        res.writeHead(400, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(
          JSON.stringify({ error: "sessionId must be a non-empty string" }),
        );
        return;
      }

      let history = sessions.get(sessionId);

      if (history === undefined) {
        history = [];
        sessions.set(sessionId, history);
      }

      history.push({ role: "user", parts: [{ text: message.trim() }] });
      console.log(JSON.stringify(history, null, 2));
      try {
        const stream = await client.models.generateContentStream({
          model: process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
          contents: message.trim(),
          config: {
            systemInstruction: `Você é um vendedor de livros que recomenda 
            obras com base nas preferências do usuário. 
            Quando as preferências forem compatíveis, recomende exatamente três livros. 
            Apresente cada recomendação em um tópico com um título curto e chamativo 
            e uma frase explicando por que o livro combina com o usuário. 
            Se as preferências entrarem em conflito, pergunte qual deve ter prioridade e 
            aguarde a resposta antes de recomendar. 
            Se o pedido não for sobre livros, explique gentilmente que você 
            pode ajudar com o catálogo da livraria.`,
          },
        });

        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });

        for await (const chunk of stream) {
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }

        res.end();
      } catch (error) {
        console.error("Gemini request failed:", error);
        if (res.headersSent) {
          res.write(
            `event: error\ndata: ${JSON.stringify({ message: "Could not generate a response" })}\n\n`,
          );
          res.end();
          return;
        }
        res.writeHead(502, {
          "Content-Type": "application/json; charset=utf-8",
        });
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
