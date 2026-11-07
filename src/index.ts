import { createServer } from "node:http";

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

   req.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf-8");

        try {
            const parsedBody = JSON.parse(body);

            const message = parsedBody?.message;

            if(typeof message !== "string" || message.trim() === "") {
                res.writeHead(400, {
                    "Content-Type": "application/json; charset=utf-8"
                }); 
                res.end(JSON.stringify({ error: "message must be a non-empty string" }));
                return;
            }

            console.log(parsedBody);

            res.writeHead(200, {
                "Content-Type": "application/json; charset=utf-8"
            });

            res.end(JSON.stringify({ status: "ok" }));

        } catch (error) {
            res.writeHead(400, {
                "Content-Type": "application/json; charset=utf-8"
            });

            res.end(JSON.stringify({
                error: "Invalid JSON"
            }));
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
