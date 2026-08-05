const fs = require('fs');
const path = require('path');

const billingPath = path.join(__dirname, 'frontend', 'src', 'pages', 'Billing.jsx');
let bContent = fs.readFileSync(billingPath, 'utf8');

// Add onKeyDown to VegInput props
bContent = bContent.replace(/function VegInput\(\{ value, onChange, onSuggestionSelect, products, placeholder \}\) \{/g, 'function VegInput({ value, onChange, onSuggestionSelect, products, placeholder, onKeyDown }) {');

// Pass onKeyDown to VegInput input
bContent = bContent.replace(/autoComplete="off"\s*style=\{\{ paddingRight: '28px' \}\}/g, 'autoComplete="off"\n        onKeyDown={onKeyDown}\n        style={{ paddingRight: \'28px\' }}');

// Add onKeyDown prop when rendering VegInput
const addRowStr = ` onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBillItemRow(); } }}`;
bContent = bContent.replace(/onSuggestionSelect=\{\(prod\) => handleItemSuggestionSelect\(idx, prod\)\}/g, `onSuggestionSelect={(prod) => handleItemSuggestionSelect(idx, prod)}\n                ${addRowStr}`);

fs.writeFileSync(billingPath, bContent, 'utf8');

const purchasesPath = path.join(__dirname, 'frontend', 'src', 'pages', 'Purchases.jsx');
let pContent = fs.readFileSync(purchasesPath, 'utf8');

// Add onKeyDown to VegInput props
pContent = pContent.replace(/function VegInput\(\{ value, onChange, onSuggestionSelect, products, placeholder \}\) \{/g, 'function VegInput({ value, onChange, onSuggestionSelect, products, placeholder, onKeyDown }) {');

// Pass onKeyDown to VegInput input
pContent = pContent.replace(/autoComplete="off"\s*style=\{\{ paddingRight: '28px' \}\}/g, 'autoComplete="off"\n        onKeyDown={onKeyDown}\n        style={{ paddingRight: \'28px\' }}');

// Add onKeyDown prop when rendering VegInput
const addPurchRowStr = ` onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPurchaseItemRow(); } }}`;
pContent = pContent.replace(/onSuggestionSelect=\{\(prod\) => handleItemSuggestionSelect\(idx, prod\)\}/g, `onSuggestionSelect={(prod) => handleItemSuggestionSelect(idx, prod)}\n                ${addPurchRowStr}`);

fs.writeFileSync(purchasesPath, pContent, 'utf8');

console.log('Fixed VegInput');
