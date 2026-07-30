const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.jsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'src', 'pages'));

files.forEach(filepath => {
    let content = fs.readFileSync(filepath, 'utf8');

    // Make modals wider and scrollable
    const target1 = 'w-full max-w-md mx-4';
    const target2 = 'w-full max-w-md';
    const replacement = 'w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto custom-scrollbar';
    
    let changed = false;
    
    if (content.includes('fixed inset-0') && (content.includes(target1) || content.includes(target2))) {
        content = content.replace(target1, replacement).replace(target2, replacement);
        changed = true;
        
        // Add custom scrollbar styles if not present
        if (!content.includes('custom-scrollbar::-webkit-scrollbar')) {
             if (content.includes('</style>')) {
                 content = content.replace('</style>', `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #9ca3af; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6b7280; }
      </style>`);
             } else {
                 const styleTag = `
      <style>{\`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #9ca3af; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6b7280; }
      \`}</style>
    </div>
  );
};`;
                 if (content.match(/<\/div>\s*\);\s*};\s*export default/)) {
                     content = content.replace(/<\/div>\s*\);\s*};\s*export default/, styleTag + '\nexport default');
                 } else if (content.match(/<\/div>\s*\);\s*}\s*export default/)) {
                     content = content.replace(/<\/div>\s*\);\s*}\s*export default/, styleTag.replace('};', '}') + '\nexport default');
                 }
             }
        }
    }
    
    if (changed) {
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`Updated modal in ${filepath}`);
    }
});
