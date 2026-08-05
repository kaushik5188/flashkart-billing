const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend', 'src', 'pages', 'Dashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add createPortal to import
if (!content.includes('createPortal')) {
  content = content.replace(
    "import React, { useState, useEffect } from 'react';",
    "import React, { useState, useEffect } from 'react';\nimport { createPortal } from 'react-dom';"
  );
}

// 2. Replace the returns in DrillDownModal
// Loading return
content = content.replace(
  "    return (\n      <div className=\"modal-backdrop\">\n        <div className=\"modal\" style={{ width: '800px', padding: '2rem', textAlign: 'center' }}>\n          <p>Loading detailed data...</p>\n        </div>\n      </div>\n    );",
  "    return createPortal(\n      <div className=\"modal-backdrop\">\n        <div className=\"modal\" style={{ width: '800px', padding: '2rem', textAlign: 'center' }}>\n          <p>Loading detailed data...</p>\n        </div>\n      </div>,\n      document.body\n    );"
);

// Profit return
content = content.replace(
  "    return (\n      <div className=\"modal-backdrop print-fullscreen\">",
  "    return createPortal(\n      <div className=\"modal-backdrop print-fullscreen\">"
);
content = content.replace(
  "        </div>\n      </div>\n    );\n  }\n\n  let columns = [];",
  "        </div>\n      </div>,\n      document.body\n    );\n  }\n\n  let columns = [];"
);

// Main return
content = content.replace(
  "  return (\n    <div className=\"modal-backdrop print-fullscreen\">",
  "  return createPortal(\n    <div className=\"modal-backdrop print-fullscreen\">"
);
// This one appears twice, one for Dashboard and one for Modal, we only want to replace the Modal one (at the end)
// The modal one ends at line 505.
content = content.substring(0, content.lastIndexOf("      </div>\n    </div>\n  );\n}")) + 
          content.substring(content.lastIndexOf("      </div>\n    </div>\n  );\n}")).replace(
            "      </div>\n    </div>\n  );\n}",
            "      </div>\n    </div>,\n    document.body\n  );\n}"
          );

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed portal');
