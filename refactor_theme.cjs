const fs = require('fs');
const path = require('path');

function processFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    const replacements = {
        '(?<!dark:)bg-gray-900(?!/)': 'bg-gray-50 dark:bg-gray-900',
        '(?<!dark:)bg-gray-800(?!/)': 'bg-white dark:bg-gray-800',
        '(?<!dark:)bg-gray-700(?!/)': 'bg-gray-100 dark:bg-gray-700',
        '(?<!dark:)text-white': 'text-gray-900 dark:text-white',
        '(?<!dark:)text-gray-400': 'text-gray-500 dark:text-gray-400',
        '(?<!dark:)text-gray-300': 'text-gray-700 dark:text-gray-300',
        '(?<!dark:)border-gray-700(?!/)': 'border-gray-200 dark:border-gray-700',
        '(?<!dark:)border-gray-600(?!/)': 'border-gray-300 dark:border-gray-600',
        '(?<!dark:)bg-gray-800/50': 'bg-white/80 dark:bg-gray-800/50',
        '(?<!dark:)bg-gray-900/50': 'bg-gray-50/80 dark:bg-gray-900/50',
        '(?<!dark:)bg-gray-800/30': 'bg-white/60 dark:bg-gray-800/30',
        '(?<!dark:)bg-gray-700/50': 'bg-gray-100/80 dark:bg-gray-700/50',
        '(?<!dark:)border-gray-700/50': 'border-gray-200 dark:border-gray-700/50',
        '(?<!dark:)border-gray-700/30': 'border-gray-200 dark:border-gray-700/30',
        '(?<!dark:)bg-gray-800/80': 'bg-white/90 dark:bg-gray-800/80',
    };

    let newContent = content;

    for (const [pattern, replacement] of Object.entries(replacements)) {
        // Since js doesn't support lookbehinds very well in older node, wait, Node.js supports lookbehinds since v9.
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
