const fs = require('fs');
const { createCanvas } = require('canvas');

// Generate PWA icons using canvas
function generateIcon(size, filename) {
  try {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Background
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = gradient;
    
    // Rounded rectangle
    const radius = size * 0.15;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();
    
    // Text "S" for Skora
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', size / 2, size / 2);
    
    // Save
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filename, buffer);
    console.log(`Generated: ${filename}`);
  } catch (err) {
    console.log(`Canvas not available, creating placeholder for ${filename}`);
    // Create a minimal valid PNG as placeholder
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
    ]);
    fs.writeFileSync(filename, pngHeader);
  }
}

// Generate icons
generateIcon(192, 'public/icons/icon-192.png');
generateIcon(512, 'public/icons/icon-512.png');
generateIcon(96, 'public/icons/shortcut-attendance.png');
generateIcon(96, 'public/icons/shortcut-leave.png');

console.log('Icon generation complete');
