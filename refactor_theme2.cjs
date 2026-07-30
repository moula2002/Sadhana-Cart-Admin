const fs = require('fs');
const path = require('path');

function processFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    const replacements = {
        '(?<!dark:)from-gray-900(?!/)': 'from-gray-50 dark:from-gray-900',
        '(?<!dark:)via-gray-800(?!/)': 'via-white dark:via-gray-800',
        '(?<!dark:)to-gray-900(?!/)': 'to-gray-50 dark:to-gray-900',
        '(?<!dark:)from-gray-800(?!/)': 'from-white dark:from-gray-800',
        '(?<!dark:)to-gray-800(?!/)': 'to-white dark:to-gray-800',
        '(?<!dark:)bg-gray-900(?!/)': 'bg-gray-50 dark:bg-gray-900', // ensure these aren't messed up if run twice? 
        // Note: The lookbehind (?<!dark:) protects against double-replacing existing dark:bg-gray-900
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
