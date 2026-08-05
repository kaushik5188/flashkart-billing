const fs = require('fs');
const path = require('path');

const purchasesPath = path.join(__dirname, 'frontend', 'src', 'pages', 'Purchases.jsx');
let pContent = fs.readFileSync(purchasesPath, 'utf8');

const onKeyDownStr = ` onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}`;

pContent = pContent.replace(/name="vegetable_name" className="form-control" placeholder="e\.g\. Potato" value=\{currentItem\.vegetable_name\} onChange=\{handleItemChange\}/g, `name="vegetable_name" className="form-control" placeholder="e.g. Potato" value={currentItem.vegetable_name} onChange={handleItemChange}${onKeyDownStr}`);

pContent = pContent.replace(/name="total_amount" className="form-control" placeholder="e\.g\. 800" value=\{currentItem\.total_amount\} onChange=\{handleItemChange\}/g, `name="total_amount" className="form-control" placeholder="e.g. 800" value={currentItem.total_amount} onChange={handleItemChange}${onKeyDownStr}`);

pContent = pContent.replace(/name="quantity" className="form-control" placeholder="e\.g\. 40" value=\{currentItem\.quantity\} onChange=\{handleItemChange\}/g, `name="quantity" className="form-control" placeholder="e.g. 40" value={currentItem.quantity} onChange={handleItemChange}${onKeyDownStr}`);

fs.writeFileSync(purchasesPath, pContent, 'utf8');
console.log('Fixed Purchases');
