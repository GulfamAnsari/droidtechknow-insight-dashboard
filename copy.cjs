const fs = require('fs');
const path = require('path');

const sourceDir = path.resolve(__dirname, 'dist'); // Change 'src' to your source folder
const destDir = "/Users/m0g0ubz/Personal/droidtechknow/admin/apps/"  // Change 'dest' to your destination folder

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function copyFilesRecursively(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyFilesRecursively(srcPath, destPath); // recurse into subdirectory
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${srcPath} → ${destPath}`);
    }
  }
}

copyFilesRecursively(sourceDir, destDir);
