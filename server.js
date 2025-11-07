import("uuid").then(({ v4: uuidv4 }) => startServer(uuidv4));

function startServer(uuidv4) {
  const express = require("express");
  const multer = require("multer");
  const AdmZip = require("adm-zip");
  const path = require("path");
  const fs = require("fs");

  const app = express();
  const PORT = 3000;

  const UPLOADS_DIR = "/uploads";

  if (!fs.existsSync(UPLOADS_DIR))
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, uuidv4() + ".zip"),
  });
  const upload = multer({ storage });

  // Serve uploads folder directly
  app.use("/uploads", express.static(UPLOADS_DIR));

  app.get("/ping", (req, res) => res.json({ message: "API working ✅" }));

  app.post("/upload", upload.single("file"), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const folderId = uuidv4();
      const extractPath = path.join(UPLOADS_DIR, folderId);
      fs.mkdirSync(extractPath, { recursive: true });

      const zip = new AdmZip(req.file.path);
      zip.extractAllTo(extractPath, true);
      fs.unlinkSync(req.file.path);

      // 🧠 Find first subfolder (inside extracted folder)
      const extractedItems = fs.readdirSync(extractPath);
      let innerFolder = "";
      if (extractedItems.length === 1) {
        const innerPath = path.join(extractPath, extractedItems[0]);
        if (fs.lstatSync(innerPath).isDirectory()) {
          innerFolder = extractedItems[0];
        }
      }

      // ✅ Build final URL
      const folderUrl = innerFolder
        ? `${req.protocol}://${req.get(
            "host"
          )}/uploads/${folderId}/${innerFolder}/index.html`
        : `${req.protocol}://${req.get("host")}/uploads/${folderId}/index.html`;

      console.log(`[UPLOAD] Extracted → ${folderUrl}`);
      res.json({ success: true, folderUrl });
    } catch (err) {
      console.error("[ERROR]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(PORT, () =>
    console.log(`🚀 Server running at http://localhost:${PORT}`)
  );
}
