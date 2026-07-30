const fs = require('fs');
const path = require('path');

const files = [
    'src/pages/Category.jsx',
    'src/pages/Customers.jsx',
    'src/pages/Orders.jsx',
    'src/pages/Posters.jsx',
    'src/pages/RefundRequests.jsx',
    'src/pages/Sellers.jsx',
    'src/pages/StickyHeader.jsx',
    'src/pages/SubCategory.jsx',
    'src/pages/SubUnderCategory.jsx',
    'src/pages/Popups.jsx'
];

files.forEach(file => {
    const filepath = path.join(__dirname, file);
    if (!fs.existsSync(filepath)) return;
    
    let content = fs.readFileSync(filepath, 'utf8');

    // Make modals wider and scrollable
    const target = 'w-full max-w-md mx-4';
    const replacement = 'w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto custom-scrollbar';
    
    if (content.includes(target)) {
        content = content.replace(target, replacement);
        
        // Add custom scrollbar styles if not present
        if (!content.includes('custom-scrollbar')) {
             if (content.includes('</style>')) {
                 // Already has style tag, just append custom-scrollbar to it if not there
             } else {
                 // Add style before the last closing div
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
                 content = content.replace(/<\/div>\s*\);\s*};\s*export default/, styleTag + '\nexport default');
             }
        }
        
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`Updated modal in ${file}`);
    }
});
