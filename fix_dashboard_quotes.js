const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend', 'src', 'pages', 'Dashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\\"/g, '"');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed quotes in Dashboard.jsx');
