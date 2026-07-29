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
  let lines = content.split('\n');
  let changed = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip accent buttons or destructive buttons because they should remain white
    if (line.includes('bg-accent-primary') || line.includes('bg-accent-gradient') || line.includes('bg-red') || line.includes('btn-primary')) {
      continue;
    }
    
    if (line.includes('text-white')) {
      lines[i] = lines[i].replace(/text-white/g, 'text-text-primary');
      changed = true;
    }
    if (lines[i].includes('hover:text-white')) {
      lines[i] = lines[i].replace(/hover:text-white/g, 'hover:text-text-primary');
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(file, lines.join('\n'));
    totalChanges++;
    console.log('Fixed:', file);
  }
});

console.log('Total files changed:', totalChanges);
