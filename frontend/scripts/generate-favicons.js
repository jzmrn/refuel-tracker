#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

async function generateFavicons() {
  try {
    // Check if sharp is available
    let sharp;
    try {
      sharp = require("sharp");
    } catch (e) {
      console.log("⚠️  Sharp not installed. Installing now...");
      const { execSync } = require("child_process");
      execSync("npm install --save-dev sharp", { stdio: "inherit" });
      sharp = require("sharp");
    }

    const publicDir = path.join(__dirname, "..", "public");
    const svgPath = path.join(publicDir, "favicon.svg");

    if (!fs.existsSync(svgPath)) {
      console.error("❌ favicon.svg not found");
      return;
    }

    console.log("🎨 Generating favicons...");

    // Read SVG
    const svgBuffer = fs.readFileSync(svgPath);

    // Generate 32x32 ICO (standard favicon size)
    await sharp(svgBuffer)
      .resize(32, 32)
      .toFile(path.join(publicDir, "favicon.ico"));
    console.log("✅ Generated favicon.ico (32x32)");

    // Generate 180x180 Apple Touch Icon
    await sharp(svgBuffer)
      .resize(180, 180)
      .toFile(path.join(publicDir, "apple-touch-icon.png"));
    console.log("✅ Generated apple-touch-icon.png (180x180)");

    // Generate 192x192 for Android
    await sharp(svgBuffer)
      .resize(192, 192)
      .toFile(path.join(publicDir, "icon-192.png"));
    console.log("✅ Generated icon-192.png (192x192)");

    // Generate 512x512 for Android
    await sharp(svgBuffer)
      .resize(512, 512)
      .toFile(path.join(publicDir, "icon-512.png"));
    console.log("✅ Generated icon-512.png (512x512)");

    console.log("");
    console.log("🎉 All favicons generated successfully!");
  } catch (error) {
    console.error("❌ Error generating favicons:", error.message);
    process.exit(1);
  }
}

generateFavicons();
