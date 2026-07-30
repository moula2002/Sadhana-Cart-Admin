const fs = require('fs');
const path = require('path');

function processFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    const replacements = {
        // bg-gray-800 with opacities
        '(?<!dark:)bg-gray-800/40': 'bg-white/80 dark:bg-gray-800/40',
        '(?<!dark:)bg-gray-800/60': 'bg-white/90 dark:bg-gray-800/60',
        
        // bg-gray-700 with opacities
        '(?<!dark:)bg-gray-700/30': 'bg-gray-100/80 dark:bg-gray-700/30',
        '(?<!dark:)bg-gray-700/20': 'bg-gray-100/60 dark:bg-gray-700/20',

        // Solid bg-gray-600
        '(?<!dark:)bg-gray-600(?!/)': 'bg-gray-100 dark:bg-gray-600',

        // specific for StickyHeader and others with missing bg-gray-900/40? 
        // check any other bg-gray-900 with opacities
        '(?<!dark:)bg-gray-900/40': 'bg-gray-50/80 dark:bg-gray-900/40',
        '(?<!dark:)bg-gray-900/50': 'bg-gray-50/90 dark:bg-gray-900/50',
    };

    let newContent = content;

    for (const [pattern, replacement] of Object.entries(replacements)) {
        const regex = new RegExp(pattern, 'g');
        newContent = newContent.replace(regex, replacement);
    }

    if (newContent !== content) {
        fs.writeFileSync(filepath, newContent, 'utf8');
        console.log(`Updated ${filepath}`);
    }
}

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.jsx') || file.endsWith('.js')) {
                results.push(file);
            }
        }
    });
    return results;
}

const directories = [
    path.join(__dirname, 'src', 'pages'),
    path.join(__dirname, 'src', 'components')
];

directories.forEach(dir => {
    if (fs.existsSync(dir)) {
        const files = walk(dir);
        files.forEach(file => {
            processFile(file);
        });
    }
});
