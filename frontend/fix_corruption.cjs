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
  
  // The corrupted values:
  // bg-text-primary/ (was bg-white/x or bg-black/x) -> let's make it bg-text-primary/5
  // border-text-primary/ (was border-white/x) -> let's make it border-text-primary/5
  
  content = content.replace(/border-text-primary\/(?!\d)/g, 'border-text-primary/10');
  content = content.replace(/bg-text-primary\/(?!\d)/g, 'bg-text-primary/5');

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    totalChanges++;
    console.log('Fixed:', file);
  }
});

console.log('Total files changed:', totalChanges);
