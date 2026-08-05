const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend', 'src', 'components', 'PrintInvoice.jsx');
let content = fs.readFileSync(file, 'utf8');

// The <style> tag starts at line 177 usually, or we can just replace everything from <style> to </style>
const styleStart = content.indexOf('<style>{`');
const styleEnd = content.indexOf('`}</style>') + 10;

let topPart = content.substring(0, styleStart);
let afterStyle = content.substring(styleEnd, content.indexOf('{/* ══════════════════════ INVOICE PAGE ══════════════════════ */}'));

const newStyle = `<style>{\`
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body > *:not(#fk-print-root) { display: none !important; }
    #fk-print-root { position: relative !important; width: 100%; z-index: 9999; overflow: visible !important; display: block !important; }
    .fk-toolbar { display: none !important; }
    @page { size: A4 portrait; margin: 10mm; }
    .fk-invoice-page { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; width: 100% !important; min-height: auto !important; }
    
    /* Crucial rules for table repetition */
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr, td, th { page-break-inside: avoid; break-inside: avoid; }
    table { page-break-inside: auto; width: 100%; border-collapse: collapse; }
  }
  tr { page-break-inside: avoid; }
  .avoid-break { page-break-inside: avoid; }
\`}</style>`;

const bottomPart = content.substring(content.indexOf('// ─── Style Helpers ────────────────────────────────────────────────────────────'));

const newRender = `{/* ══════════════════════ INVOICE PAGE ══════════════════════ */}
        <div id="fk-invoice-document" className="fk-invoice-page" style={{
          width: '210mm',
          margin: '0 auto',
          backgroundColor: '#FFFFFF',
          fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
          fontSize: '11px',
          color: '#1a1a1a',
          boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
          overflow: 'visible'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead style={{ display: 'table-header-group' }}>
              <tr>
                <td colSpan={6} style={{ padding: 0, border: 'none' }}>
                  
                  {/* ── HEADER BANNER ─────────────────────────────────────── */}
                  <div style={{ position: 'relative', backgroundColor: '#fff', overflow: 'hidden' }}>
                    <div style={{ height: '8px', background: 'linear-gradient(90deg, #1B5E20, #2E7D32, #388E3C, #2E7D32, #1B5E20)' }} />
                    <div style={{
                      backgroundImage: 'url(/inv_header.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
                      padding: '12px 18px 0 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '110px', position: 'relative'
                    }}>
                      {/* Center: Logo */}
                      <div style={{ flex: 1, textAlign: 'center', zIndex: 2, position: 'relative', padding: '0 110px' }}>
                        <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'center' }}>
                          <div style={{ width: '44px', height: '44px', backgroundColor: '#1B5E20', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ShoppingCart size={24} color="#FFFFFF" />
                          </div>
                        </div>
                        <div style={{ lineHeight: 1 }}>
                          <span style={{ fontSize: '30px', fontWeight: 900, fontFamily: "'Outfit', sans-serif", letterSpacing: '-1px' }}>
                            <span style={{ color: '#1B5E20' }}>FLASH</span>
                            <span style={{ color: '#E65100' }}>KART</span>
                          </span>
                        </div>
                        <div style={{
                          display: 'inline-block', backgroundColor: '#1B5E20', color: '#FFFFFF',
                          padding: '3px 20px', borderRadius: '20px', fontSize: '9px',
                          fontWeight: 800, letterSpacing: '1.5px', marginTop: '5px', marginBottom: '3px'
                        }}>
                          FRESH VEGETABLES, BETTER LIFE
                        </div>
                        <div style={{ fontFamily: "'Dancing Script', cursive, serif", fontSize: '11px', color: '#2E7D32', fontStyle: 'italic', marginTop: '2px' }}>
                          Fresh Vegetables Daily, Healthy Life Always
                        </div>
                      </div>

                      {/* Right: Owners & Contacts */}
                      <div style={{
                        position: 'absolute', right: '115px', top: '16px', zIndex: 3, textAlign: 'right', lineHeight: '1.6',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '6px 10px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end', marginBottom: '4px' }}>
                          <div style={{ width: '18px', height: '18px', backgroundColor: '#1B5E20', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#fff', fontSize: '9px', fontWeight: 700 }}>P</span>
                          </div>
                          <div style={{ fontWeight: 800, color: '#1B5E20', fontSize: '10px', lineHeight: '1.3' }}>
                            {(settings.owners || 'Kaushik Patel, Om Patel').split(',').map((o, i) => (
                              <div key={i}>{o.trim().toUpperCase()}</div>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', justifyContent: 'flex-end' }}>
                          <div style={{ width: '18px', height: '18px', backgroundColor: '#1B5E20', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', flexShrink: 0 }}>
                            <span style={{ color: '#fff', fontSize: '9px' }}>📞</span>
                          </div>
                          <div style={{ color: '#1B5E20', fontWeight: 700, fontSize: '10px', lineHeight: '1.5' }}>
                            {(settings.contacts || '6352856495\\n9773271029').split(',').map((c, i) => (
                              <div key={i}>{c.trim()}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <svg viewBox="0 0 800 24" style={{ display: 'block', width: '100%', height: '24px' }} preserveAspectRatio="none">
                      <path d="M0,12 C100,24 200,0 300,12 C400,24 500,0 600,12 C700,24 800,0 800,12 L800,24 L0,24 Z" fill="#2E7D32" />
                    </svg>
                  </div>

                  {/* ── BILL/INVOICE TITLE ─────────────────────────────────── */}
                  <div style={{ textAlign: 'center', margin: '10px 0 8px' }}>
                    <div style={{
                      display: 'inline-block', background: 'linear-gradient(90deg, #1B5E20, #2E7D32)', color: '#FFFFFF',
                      padding: '6px 40px', borderRadius: '6px', fontSize: '13px', fontWeight: 800, letterSpacing: '2px'
                    }}>
                      BILL / INVOICE
                    </div>
                  </div>

                  {/* ── CUSTOMER INFO ROW ──────────────────────────────────── */}
                  <div style={{ padding: '8px 20px 6px', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0 30px' }}>
                    <div style={{ fontSize: '10.5px' }}>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Customer Name :</span>
                        <div style={{ flex: 1, borderBottom: '1px solid #333', paddingBottom: '1px', minWidth: '120px', fontWeight: 600 }}>
                          {invoice.customer_name}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: 700 }}>Address :</span>
                        <div style={{ flex: 1, borderBottom: '1px solid #333', paddingBottom: '1px' }}>
                          {invoice.customer_address || invoice.customer_place || ''}
                        </div>
                      </div>
                      {invoice.customer_mobile && (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'flex-end' }}>
                          <span style={{ fontWeight: 700 }}>Mobile :</span>
                          <div style={{ borderBottom: '1px solid #333', paddingBottom: '1px', paddingLeft: '4px' }}>
                            {invoice.customer_mobile}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '10.5px' }}>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Bill No. :</span>
                        <div style={{ flex: 1, borderBottom: '1px solid #333', paddingBottom: '1px', fontWeight: 700, color: '#E65100' }}>
                          {invoice.bill_number}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: 700 }}>Date :</span>
                        <div style={{ flex: 1, borderBottom: '1px solid #333', paddingBottom: '1px' }}>
                          {fmtDate(invoice.invoice_date)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* To ensure spacing before headers */}
                  <div style={{ height: '6px' }}></div>
                </td>
              </tr>
              
              {/* TABLE COLUMN HEADERS */}
              <tr style={{ background: 'linear-gradient(90deg, #1B5E20, #2E7D32)', color: '#FFFFFF' }}>
                {[
                  { label: 'SR. NO.', align: 'center', w: '9%' },
                  { label: 'ITEM', align: 'left', w: '30%' },
                  { label: 'QUANTITY\\n(Kg)', align: 'center', w: '15%' },
                  { label: 'RATE PER KG\\n(₹)', align: 'center', w: '16%' },
                  { label: 'AMOUNT\\n(₹)', align: 'center', w: '16%' },
                  { label: 'REMARKS', align: 'center', w: '14%' }
                ].map((col, i) => (
                  <th key={i} style={{
                    width: col.w,
                    padding: '6px 5px',
                    fontSize: '9px',
                    fontWeight: 800,
                    textAlign: col.align,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    border: '1px solid #1B5E20',
                    whiteSpace: 'pre-line',
                    lineHeight: '1.3'
                  }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody style={{ display: 'table-row-group' }}>
              {displayItems.map((item, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F4FAF4', pageBreakInside: 'avoid' }}>
                  <td style={tdStyle('center', '#555')}>{idx + 1}.</td>
                  <td style={tdStyle('left', '#000', 700)}>{item?.product_name || ''}</td>
                  <td style={tdStyle('center')}>{item ? parseFloat(item.quantity).toFixed(2) : ''}</td>
                  <td style={tdStyle('center')}>{item ? '₹' + parseFloat(item.rate).toFixed(2) : ''}</td>
                  <td style={tdStyle('center', '#1a1a1a', 700)}>{item ? '₹' + parseFloat(item.amount).toFixed(2) : ''}</td>
                  <td style={tdStyle('center', '#555')}>{item?.remarks || ''}</td>
                </tr>
              ))}
            </tbody>

            {/* TOTALS & TERMS (Avoid breaking) */}
            <tbody style={{ display: 'table-row-group' }}>
              <tr style={{ pageBreakInside: 'avoid' }}>
                <td colSpan={6} style={{ padding: '0', border: 'none' }}>
                  
                  {/* ── TOTALS ────────────────────────────────── */}
                  <div style={{ padding: '6px 20px', display: 'flex', gap: '12px', alignItems: 'flex-start', marginTop: '2px' }}>
                    <div style={{ flex: 1.1 }}>
                      <div style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '6px 8px', minHeight: '45px', backgroundColor: '#FAFAFA' }}>
                        <div style={{ fontSize: '8.5px', fontWeight: 700, marginBottom: '3px', color: '#333' }}>Amount in Words :</div>
                        <div style={{ fontSize: '8.5px', color: '#1B5E20', fontWeight: 600, lineHeight: '1.4' }}>
                          {amountInWords}
                        </div>
                      </div>
                    </div>

                    <div style={{ flex: 1.1 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                        <tbody>
                          <tr>
                            <td style={summaryLabelCell('#2E7D32', '#FFFFFF')}>TOTAL WEIGHT (Kg)</td>
                            <td style={summaryValCell('#E8F5E9', '#1B5E20', false, true)}>
                              {totalWeight.toFixed(2)}
                            </td>
                          </tr>
                          <tr>
                            <td style={summaryLabelCell('#2E7D32', '#FFFFFF')}>TOTAL AMOUNT (₹)</td>
                            <td style={summaryValCell('#E8F5E9', '#1B5E20', false, true)}>
                              {subtotal > 0 ? '₹ ' + subtotal.toFixed(2) : ''}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ ...summaryLabelCell('#1B5E20', '#FFFFFF'), fontSize: '12px', fontWeight: 900, letterSpacing: '0.5px' }}>GRAND TOTAL</td>
                            <td style={{ ...summaryValCell('#1B5E20', '#FFFFFF', true), fontSize: '13px', fontWeight: 900 }}>
                              ₹ {finalBillTotal.toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ── TERMS & CONDITIONS ─────────────────────────────────── */}
                  <div style={{ padding: '5px 20px', fontSize: '8.5px', color: '#444', lineHeight: '1.4', marginTop: '5px', borderTop: '1px dashed #E0E0E0' }}>
                    <div style={{ color: '#2E7D32', fontWeight: 800, fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Terms & Conditions
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}><span style={{ color: '#2E7D32', fontWeight: 800 }}>1.</span><span>Please check the quantity and quality of goods at the time of delivery.</span></div>
                      <div style={{ display: 'flex', gap: '6px' }}><span style={{ color: '#2E7D32', fontWeight: 800 }}>2.</span><span>Any issue or shortage must be reported immediately upon delivery.</span></div>
                      <div style={{ display: 'flex', gap: '6px' }}><span style={{ color: '#2E7D32', fontWeight: 800 }}>3.</span><span>Report any issue immediately to our team.</span></div>
                      <div style={{ display: 'flex', gap: '6px' }}><span style={{ color: '#2E7D32', fontWeight: 800 }}>4.</span><span>FLASHKART will take responsibility for genuine delivery-related issues reported at the time of delivery.</span></div>
                    </div>
                  </div>

                </td>
              </tr>
            </tbody>

            {/* ── REPEATING FOOTER ─────────────────────────────────────── */}
            <tfoot style={{ display: 'table-footer-group' }}>
              <tr>
                <td colSpan={6} style={{ padding: '0', border: 'none' }}>
                  
                  {/* Signature and Thank You */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '10px 40px 10px 40px' }}>
                    {/* Left: Thank You */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: '26px', color: '#2E7D32', fontWeight: 700, lineHeight: 1.1 }}>
                        Thank You!
                      </div>
                      <div style={{ fontSize: '9px', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '2px' }}>
                        <span style={{ color: '#2E7D32' }}>🌿</span> Visit Again <span style={{ color: '#2E7D32' }}>🌿</span>
                      </div>
                    </div>

                    {/* Right: Signature */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <img src="/final_stamp.png" alt="Authorized Stamp" style={{ width: '100px', height: '100px', transform: 'rotate(-5deg)', mixBlendMode: 'multiply', opacity: 0.95, pointerEvents: 'none', objectFit: 'contain' }} />
                      <div style={{ padding: '4px 0 0 0', borderTop: '1.5px solid #333', fontSize: '10px', color: '#111', fontWeight: 800, minWidth: '150px', textAlign: 'center' }}>
                        Authorized Signature
                      </div>
                    </div>
                  </div>

                  {/* ── FOOTER BAR ─────────────────────────────────────────── */}
                  <div style={{
                    background: 'linear-gradient(90deg, #1B5E20, #2E7D32, #1B5E20)',
                    color: '#FFFFFF', textAlign: 'center', padding: '7px 12px', fontSize: '10px', fontWeight: 700,
                    letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}>
                    <span>📍</span> Thank You For Your Business! <span>🥦</span>
                  </div>

                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
`;

const finalContent = topPart + newStyle + afterStyle + newRender + bottomPart;
fs.writeFileSync(file, finalContent, 'utf8');
console.log('Rewrite successful');
