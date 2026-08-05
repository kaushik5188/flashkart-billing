const fs = require('fs');
const path = require('path');

function fixFile(filePath, addRowFunctionName) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add onKeyDown handler to inputs
  const onKeyDownStr = ` onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ${addRowFunctionName}(); } }}`;

  // Fix quantity input
  content = content.replace(/className="form-control"\s*placeholder="Qty"\s*value=\{item.quantity\}/g, `className="form-control" placeholder="Qty" value={item.quantity}${onKeyDownStr}`);
  
  // Fix rate input
  content = content.replace(/className="form-control"\s*placeholder="Rate"\s*value=\{item.rate\}/g, `className="form-control" placeholder="Rate" value={item.rate}${onKeyDownStr}`);
  
  // Fix remarks input
  content = content.replace(/className="form-control"\s*placeholder="Remarks"\s*value=\{item.remarks\}/g, `className="form-control" placeholder="Remarks" value={item.remarks}${onKeyDownStr}`);
  
  fs.writeFileSync(filePath, content, 'utf8');
}

fixFile(path.join(__dirname, 'frontend', 'src', 'pages', 'Billing.jsx'), 'addBillItemRow');
fixFile(path.join(__dirname, 'frontend', 'src', 'pages', 'Purchases.jsx'), 'addPurchaseItemRow');

console.log("Enter key handlers added successfully.");
