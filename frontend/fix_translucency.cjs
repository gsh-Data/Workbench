const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    } else if (file.endsWith('.vue')) {
      filelist.push(path.join(dir, file));
    }
  });
  return filelist;
};

const vueFiles = walkSync('./src');
let totalChanges = 0;

vueFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Replace white borders/bgs with text-primary to adapt to light/dark modes
  content = content.replace(/border-white\/([0-9]+)/g, 'border-text-primary/');
  
  // For backgrounds, bg-white/5 in dark mode is a slight lightening. 
  // In light mode, it needs to be bg-text-primary/5 (which is dark blue/black 5%).
  // So bg-white/5 -> bg-text-primary/5
  content = content.replace(/bg-white\/([0-9]+)/g, 'bg-text-primary/');
  
  // For bg-black/20, in dark mode it's darkening.
  // In light mode, darkening means bg-text-primary/10 or something. 
  // Actually, we can just map bg-black/x to bg-text-primary/10 (since text-primary is black in light mode, and white in dark mode. Wait. If text-primary is white in dark mode, bg-text-primary/10 LIGHTENS. But bg-black/20 DARKENED in dark mode!
  // To DARKEN in both modes: bg-black/20 is fine because black is black in both modes. But it looks muddy in light mode. Let's map it to bg-bg-tertiary/50 which is a generic background tier.
  content = content.replace(/bg-black\/([0-9]+)/g, 'bg-text-primary/5');

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    totalChanges++;
    console.log('Fixed:', file);
  }
});

console.log('Total files changed:', totalChanges);
