import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { generateEcfXml } from "./src/services/server/ecfXmlService.js";
import { signXmlXadesBes } from "./src/services/server/signatureService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "FacturaDO API" });
  });

  app.post("/api/invoices/generate-xml", (req, res) => {
    try {
      const xml = generateEcfXml(req.body);
      res.set('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error("XML Generation Error:", error);
      res.status(500).json({ error: "Failed to generate XML" });
    }
  });

  app.post("/api/invoices/sign-xml", async (req, res) => {
    try {
      const { xml, certificate, privateKey } = req.body;
      if (!xml || !certificate || !privateKey) {
        return res.status(400).json({ error: "Missing required fields: xml, certificate, privateKey" });
      }

      const signedXml = await signXmlXadesBes(xml, certificate, privateKey);
      res.set('Content-Type', 'application/xml');
      res.send(signedXml);
    } catch (error) {
      console.error("XML Signing Error:", error);
      res.status(500).json({ error: "Failed to sign XML", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/dgii/submit", async (req, res) => {
    try {
      const { signedXml } = req.body;
      if (!signedXml) return res.status(400).json({ error: "Missing signedXml" });

      // Simulate DGII processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate DGII response
      const trackId = "DGII-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      const status = Math.random() > 0.1 ? "ACCEPTED" : "REJECTED";
      const message = status === "ACCEPTED" ? "e-CF recibido y aceptado correctamente" : "Error de validación: RNC del receptor no válido";

      res.json({ trackId, status, message, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("DGII Submission Error:", error);
      res.status(500).json({ error: "Failed to submit to DGII" });
    }
  });

  app.post("/api/reports/606", (req, res) => {
    const { rnc, period } = req.body;
    // Simulate 606 report generation
    res.json({ 
      message: "Reporte 606 generado", 
      reportId: "REP606-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      rnc, 
      period,
      data: [] 
    });
  });

  app.post("/api/reports/607", (req, res) => {
    const { rnc, period } = req.body;
    // Simulate 607 report generation
    res.json({ 
      message: "Reporte 607 generado", 
      reportId: "REP607-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      rnc, 
      period,
      data: [] 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
