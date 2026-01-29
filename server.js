// =============================
//  media-converter server.js
//  High-Fidelity File + YouTube Converter
// =============================

const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();

// -----------------------------
// 1️⃣ Simple Password Protection
// -----------------------------
const BASIC_PASSWORD = "zwonaka1"; // <-- change this to your own secret

// Middleware to check password for every request
app.use((req, res, next) => {
  const pass = req.query.pass || req.headers["x-pass"];
  if (pass !== BASIC_PASSWORD) {
    return res.status(401).send("Unauthorized: Incorrect password");
  }
  next(); // password correct, continue
});

// -----------------------------
// 2️⃣ File Upload Setup
// -----------------------------
const upload = multer({ dest: "uploads/" });

// Serve frontend files
app.use(express.static("public"));

// -----------------------------
// 3️⃣ FILE → WAV (24-bit, 48kHz)
// -----------------------------
app.post("/convert", upload.single("file"), (req, res) => {
  const inputPath = req.file.path;
  const outputPath = `outputs/${Date.now()}.wav`;

  ffmpeg(inputPath)
    .outputOptions([
      "-vn",                // ignore video
      "-acodec pcm_s24le",  // 24-bit WAV
      "-ar 48000",          // Pro sample rate
      "-ac 2"               // stereo
    ])
    .toFormat("wav")
    .on("end", () => {
      res.download(outputPath, () => {
        // Clean up temp files
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      });
    })
    .on("error", (err) => {
      console.error(err);
      res.status(500).send("Conversion failed");
    })
    .save(outputPath);
});

// -----------------------------
// 4️⃣ YouTube → MP4 (Best Quality)
// -----------------------------
app.get("/yt/mp4", (req, res) => {
  const url = req.query.url;
  const output = `outputs/${Date.now()}.mp4`;

  exec(
    `yt-dlp -f "bv*+ba/best" --merge-output-format mp4 -o "${output}" "${url}"`,
    (err) => {
      if (err) return res.status(500).send("Download failed");
      res.download(output, () => fs.unlinkSync(output));
    }
  );
});

// -----------------------------
// 5️⃣ YouTube → MP3 (320kbps)
// -----------------------------
app.get("/yt/mp3", (req, res) => {
  const url = req.query.url;
  const output = `outputs/${Date.now()}.mp3`;

  exec(
    `yt-dlp -f ba -x --audio-format mp3 --audio-quality 0 -o "${output}" "${url}"`,
    (err) => {
      if (err) return res.status(500).send("Download failed");
      res.download(output, () => fs.unlinkSync(output));
    }
  );
});

// -----------------------------
// 6️⃣ Start the server
// -----------------------------
app.listen(3000, () =>
  console.log("🚀 Server running at http://localhost:3000/?pass=" + BASIC_PASSWORD)
);
