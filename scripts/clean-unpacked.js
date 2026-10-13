const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'release', 'win-unpacked');

function rmdir(d) {
  if (!fs.existsSync(d)) return;
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    const full = path.join(d, entry.name);
    if (entry.isDirectory()) rmdir(full);
    else { try { fs.unlinkSync(full); } catch (e) {} }
  }
  try { fs.rmdirSync(d); } catch (e) {}
}

rmdir(dir);
if (!fs.existsSync(dir)) {
  console.log('[clean] win-unpacked removed');
}
process.exit(0);
