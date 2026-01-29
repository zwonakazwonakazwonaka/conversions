const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
// Middleware to check password
app.use((req, res, next) => {
  // Check query parameter or HTTP header
  const pass = req.query.pass || req.headers["x-pass"];

  if (pass !== BASIC_PASSWORD) {
    return res.status(401).send("Unauthorized: Incorrect password");
  }

  next(); // password is correct, continue to route
});

const upload = multer({ dest: "uploads/" });

// Simple password protection
const BASIC_PASSWORD = "zwonaka1"; // <-- change this

app.use(express.static("public"));

/* =============================
   FILE → WAV (MAX QUALITY)
============================= */
app.post("/convert", upload.single("file"), (req, res) => {
  const inputPath = req.file.path;
  const outputPath = `outputs/${Date.now()}.wav`;

  ffmpeg(inputPath)
    .outputOptions([
      "-vn",
      "-acodec pcm_s24le", // 24-bit WAV
      "-ar 48000",         // Pro sample rate
      "-ac 2"
    ])
    .toFormat("wav")
    .on("end", () => {
      res.download(outputPath, () => {
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      });
    })
    .on("error", err => {
      console.error(err);
      res.status(500).send("Conversion failed");
    })
    .save(outputPath);
});

/* =============================
   YOUTUBE → MP4 (BEST QUALITY)
============================= */
app.get("/yt/mp4", (req, res) => {
  const url = req.query.url;
  const output = `outputs/${Date.now()}.mp4`;

  exec(
    `yt-dlp -f "bv*+ba/best" --merge-output-format mp4 -o "${output}" "${url}"`,
    err => {
      if (err) return res.status(500).send("Download failed");
      res.download(output, () => fs.unlinkSync(output));
    }
  );
});

/* =============================
   YOUTUBE → MP3 (320kbps)
============================= */
app.get("/yt/mp3", (req, res) => {
  const url = req.query.url;
  const output = `outputs/${Date.now()}.mp3`;

  exec(
    `yt-dlp -f ba -x --audio-format mp3 --audio-quality 0 -o "${output}" "${url}"`,
    err => {
      if (err) return res.status(500).send("Download failed");
      res.download(output, () => fs.unlinkSync(output));
    }
  );
});

app.listen(3000, () =>
  console.log("🚀 Running at http://localhost:3000")
);
