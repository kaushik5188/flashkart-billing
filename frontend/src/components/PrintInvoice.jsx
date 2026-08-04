import React, { useState, useEffect } from 'react';
import { Printer, X, MessageCircle, ArrowLeft, ShoppingCart } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function numberToWords(num) {
  if (isNaN(num) || num === undefined) return 'Zero';
  num = Math.round(num * 100) / 100;
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '') + ' ';
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + inWords(n % 100);
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + inWords(n % 1000);
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + inWords(n % 100000);
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + inWords(n % 10000000);
  }

  const parts = String(num).split('.');
  const intPart = parseInt(parts[0]);
  const decPart = parts[1] ? parseInt(parts[1].padEnd(2, '0')) : 0;
  let result = inWords(intPart).trim() || 'Zero';
  if (decPart > 0) result += ' and ' + inWords(decPart).trim() + ' Paise';
  return result + ' Only';
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function PrintInvoice({ invoiceId, token, API_URL, onClose }) {
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (invoiceId) fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    setLoading(true);
    setError('');
    try {
      const [invRes, settRes] = await Promise.all([
        fetch(`${API_URL}/api/billing/${invoiceId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/settings`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (!invRes.ok) throw new Error('Invoice not found.');
      const invData = await invRes.json();
      const settData = await settRes.json();
      setInvoice(invData.invoice);
      setItems(invData.items);
      setSettings(settData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const getPdfOptions = (inv) => ({
    margin: 0,
    filename: `Invoice_${inv.bill_number}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, scrollY: 0, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  });

  const handleWhatsApp = () => {
    if (!invoice) return;
    const root = document.getElementById('fk-print-root');
    const originalScroll = root ? root.scrollTop : 0;
    if (root) root.scrollTop = 0;

    const element = document.getElementById('fk-invoice-document');
    window.html2pdf().set(getPdfOptions(invoice)).from(element).save().then(() => {
      if (root) root.scrollTop = originalScroll;
    });

    const phone = (invoice.customer_mobile || '').replace(/\D/g, '');
    const phoneParam = phone ? (phone.length === 10 ? '91' + phone : phone) : '';
    const msg = `Hello *${invoice.customer_name}*,\n\nPlease find your attached bill for *₹${invoice.grand_total.toFixed(2)}*.\n\nThank you for your business!`;
    
    setTimeout(() => {
      window.open(`https://wa.me/${phoneParam}?text=${encodeURIComponent(msg)}`, '_blank');
    }, 800);
  };

  const handleDownload = () => {
    const root = document.getElementById('fk-print-root');
    const originalScroll = root ? root.scrollTop : 0;
    if (root) root.scrollTop = 0;

    const element = document.getElementById('fk-invoice-document');
    if (!window.html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        window.html2pdf().set(getPdfOptions(invoice)).from(element).save().then(() => {
          if (root) root.scrollTop = originalScroll;
        });
      };
      document.body.appendChild(script);
    } else {
      window.html2pdf().set(getPdfOptions(invoice)).from(element).save().then(() => {
        if (root) root.scrollTop = originalScroll;
      });
    }
  };

  if (!invoiceId) return null;

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', color: '#333' }}>Loading invoice...</div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', maxWidth: '360px', textAlign: 'center' }}>
          <p style={{ color: '#D32F2F', marginBottom: '1rem' }}>{error || 'Invoice not found.'}</p>
          <button onClick={onClose} style={{ padding: '8px 20px', background: '#2E7D32', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    );
  }

  // ---- Pagination Logic ----
  const ITEMS_PER_PAGE = 25;
  const chunkedItems = [];
  if (!items || items.length === 0) {
    chunkedItems.push([]);
  } else {
    for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
      chunkedItems.push(items.slice(i, i + ITEMS_PER_PAGE));
    }
  }
  const totalPages = chunkedItems.length;

  const subtotal = items.reduce((s, i) => s + (i.amount || 0), 0);
  const totalWeight = items.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);
  const finalBillTotal = subtotal - (invoice.discount || 0);
  const amountInWords = numberToWords(finalBillTotal);

  const fmtDate = (d) => {
    if (!d) return '__ / __ / ______';
    const [y, m, day] = d.split('-');
    return `${day} / ${m} / ${y}`;
  };

  return (
    <>
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
          body > *:not(#fk-print-root) { display: none !important; }
          #fk-print-root { position: absolute; left: 0; top: 0; width: 100%; display: block !important; padding: 0 !important; }
          .fk-toolbar { display: none !important; }
          @page { size: A4 portrait; margin: 0; }
          .fk-invoice-page { margin: 0 !important; box-shadow: none !important; border: none !important; page-break-after: always; }
          .fk-invoice-page:last-child { page-break-after: auto; }
        }
      `}</style>

      <div id="fk-print-root" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.72)', zIndex: 600, overflowY: 'auto', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Toolbar */}
        <div className="fk-toolbar" style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={onClose} style={toolBtn('#555')}>
            <ArrowLeft size={15} /> Back
          </button>
          <button onClick={handlePrint} style={toolBtn('#2E7D32')}>
            <Printer size={15} /> Print
          </button>
          <button onClick={handleDownload} style={toolBtn('#1565C0')}>
            <Printer size={15} /> Download PDF
          </button>
          <button onClick={handleWhatsApp} style={toolBtn('#25D366')}>
            <MessageCircle size={15} /> WhatsApp
          </button>
        </div>

        {/* Multi-page container */}
        <div id="fk-invoice-document" style={{ width: '210mm', display: 'flex', flexDirection: 'column' }}>
          {chunkedItems.map((pageItems, pageIndex) => {
            const isLastPage = pageIndex === totalPages - 1;
            return (
              <div key={pageIndex} className="fk-invoice-page html2pdf__page-break" style={{
                width: '210mm',
                height: '296.5mm', // Almost exactly A4 height
                backgroundColor: '#FFFFFF',
                fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
                color: '#1a1a1a',
                boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
                marginBottom: isLastPage ? '0' : '20px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                pageBreakAfter: isLastPage ? 'auto' : 'always'
              }}>
                
                {/* ── HEADER (Every Page) ── */}
                <div style={{ flexShrink: 0 }}>
                  <div style={{ height: '8px', background: 'linear-gradient(90deg, #1B5E20, #2E7D32, #388E3C, #2E7D32, #1B5E20)' }} />
                  <div style={{
                    backgroundImage: 'url(/inv_header.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
                    padding: '12px 18px 0 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '110px', position: 'relative'
                  }}>
                    {/* Logo Area */}
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
                        padding: '3px 20px', borderRadius: '20px', fontSize: '10px',
                        fontWeight: 800, letterSpacing: '1.5px', marginTop: '5px', marginBottom: '3px'
                      }}>
                        FRESH VEGETABLES, BETTER LIFE
                      </div>
                    </div>
                    {/* Contacts Area */}
                    <div style={{
                      position: 'absolute', right: '15px', top: '16px', zIndex: 3, textAlign: 'right', lineHeight: '1.6',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '6px 10px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end', marginBottom: '4px' }}>
                        <div style={{ width: '18px', height: '18px', backgroundColor: '#1B5E20', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>P</span>
                        </div>
                        <div style={{ fontWeight: 800, color: '#1B5E20', fontSize: '11px', lineHeight: '1.3' }}>
                          {(settings.owners || 'Kaushik Patel, Om Patel').split(',').map((o, i) => (
                            <div key={i}>{o.trim().toUpperCase()}</div>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', justifyContent: 'flex-end' }}>
                        <div style={{ width: '18px', height: '18px', backgroundColor: '#1B5E20', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', flexShrink: 0 }}>
                          <span style={{ color: '#fff', fontSize: '10px' }}>📞</span>
                        </div>
                        <div style={{ color: '#1B5E20', fontWeight: 700, fontSize: '11px', lineHeight: '1.5' }}>
                          {(settings.contacts || '6352856495\n9773271029').split(',').map((c, i) => (
                            <div key={i}>{c.trim()}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <svg viewBox="0 0 800 24" style={{ display: 'block', width: '100%', height: '24px' }} preserveAspectRatio="none">
                    <path d="M0,12 C100,24 200,0 300,12 C400,24 500,0 600,12 C700,24 800,0 800,12 L800,24 L0,24 Z" fill="#2E7D32" />
                  </svg>
                  
                  <div style={{ textAlign: 'center', margin: '6px 0 4px' }}>
                    <div style={{
                      display: 'inline-block', background: 'linear-gradient(90deg, #1B5E20, #2E7D32)', color: '#FFFFFF',
                      padding: '4px 40px', borderRadius: '6px', fontSize: '14px', fontWeight: 800, letterSpacing: '2px'
                    }}>
                      BILL / INVOICE
                    </div>
                  </div>

                  <div style={{ padding: '4px 20px 8px', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0 30px' }}>
                    <div style={{ fontSize: '11px' }}>
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
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'flex-end' }}>
                          <span style={{ fontWeight: 700 }}>Mobile :</span>
                          <div style={{ borderBottom: '1px solid #333', paddingBottom: '1px', paddingLeft: '4px' }}>
                            {invoice.customer_mobile}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '11px' }}>
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
                </div>

                {/* ── TABLE (Every Page) ── */}
                <div style={{ padding: '0 20px', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(90deg, #1B5E20, #2E7D32)', color: '#FFFFFF' }}>
                        {[
                          { label: 'SR. NO.', align: 'center', w: '9%' },
                          { label: 'ITEM', align: 'left', w: '30%' },
                          { label: 'QTY (Kg)', align: 'center', w: '13%' },
                          { label: 'RATE (₹)', align: 'center', w: '16%' },
                          { label: 'AMOUNT (₹)', align: 'center', w: '16%' },
                          { label: 'REMARKS', align: 'center', w: '16%' }
                        ].map((col, i) => (
                          <th key={i} style={{
                            width: col.w,
                            padding: '6px 5px',
                            fontSize: '11px',
                            fontWeight: 800,
                            textAlign: col.align,
                            border: '1px solid #1B5E20',
                          }}>
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((item, idx) => {
                        const globalIdx = pageIndex * ITEMS_PER_PAGE + idx + 1;
                        return (
                          <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F4FAF4' }}>
                            <td style={tdStyle('center', '#555')}>{globalIdx}.</td>
                            <td style={tdStyle('left', '#000', 700)}>{item?.product_name || ''}</td>
                            <td style={tdStyle('center')}>{item ? parseFloat(item.quantity).toFixed(2) : ''}</td>
                            <td style={tdStyle('center')}>{item ? '₹' + parseFloat(item.rate).toFixed(2) : ''}</td>
                            <td style={tdStyle('center', '#1a1a1a', 700)}>{item ? '₹' + parseFloat(item.amount).toFixed(2) : ''}</td>
                            <td style={tdStyle('center', '#555')}>{item?.remarks || ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── FOOTER & TOTALS SECTION ── */}
                <div style={{ marginTop: 'auto', flexShrink: 0 }}>
                  
                  {isLastPage && (
                    <div style={{ padding: '0 20px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1.1 }}>
                          <div style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '6px 8px', minHeight: '45px', backgroundColor: '#FAFAFA' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '3px', color: '#333' }}>Amount in Words :</div>
                            <div style={{ fontSize: '11px', color: '#1B5E20', fontWeight: 600, lineHeight: '1.4' }}>
                              {amountInWords}
                            </div>
                          </div>
                        </div>
                        <div style={{ flex: 1.1 }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                                <td style={{ ...summaryValCell('#1B5E20', '#FFFFFF', true), fontSize: '14px', fontWeight: 900 }}>
                                  ₹ {finalBillTotal.toFixed(2)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div style={{ fontSize: '11px', color: '#444', lineHeight: '1.4', marginTop: '8px', borderTop: '1px dashed #E0E0E0', paddingTop: '4px' }}>
                        <div style={{ color: '#2E7D32', fontWeight: 800, fontSize: '11px', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Terms & Conditions
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}><span style={{ color: '#2E7D32', fontWeight: 800 }}>1.</span><span>Please check the quantity and quality of goods at the time of delivery.</span></div>
                          <div style={{ display: 'flex', gap: '6px' }}><span style={{ color: '#2E7D32', fontWeight: 800 }}>2.</span><span>Any issue or shortage must be reported immediately upon delivery.</span></div>
                          <div style={{ display: 'flex', gap: '6px' }}><span style={{ color: '#2E7D32', fontWeight: 800 }}>3.</span><span>Report any issue immediately to our team.</span></div>
                          <div style={{ display: 'flex', gap: '6px' }}><span style={{ color: '#2E7D32', fontWeight: 800 }}>4.</span><span>FLASHKART will take responsibility for genuine delivery-related issues reported at the time of delivery.</span></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Signature and Thank You (Every Page) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '5px 40px 10px 40px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: '26px', color: '#2E7D32', fontWeight: 700, lineHeight: 1.1 }}>
                        Thank You!
                      </div>
                      <div style={{ fontSize: '11px', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '2px' }}>
                        <span style={{ color: '#2E7D32' }}>🌿</span> Visit Again <span style={{ color: '#2E7D32' }}>🌿</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#555', paddingBottom: '10px' }}>
                       Page {pageIndex + 1} of {totalPages}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <img src="/final_stamp.png" alt="Authorized Stamp" style={{ width: '80px', height: '80px', transform: 'rotate(-5deg)', mixBlendMode: 'multiply', opacity: 0.95, pointerEvents: 'none', objectFit: 'contain' }} />
                      <div style={{ padding: '4px 0 0 0', borderTop: '1.5px solid #333', fontSize: '11px', color: '#111', fontWeight: 800, minWidth: '150px', textAlign: 'center' }}>
                        Authorized Signature
                      </div>
                    </div>
                  </div>

                  {/* FOOTER BAR */}
                  <div style={{
                    background: 'linear-gradient(90deg, #1B5E20, #2E7D32, #1B5E20)',
                    color: '#FFFFFF', textAlign: 'center', padding: '8px 12px', fontSize: '11px', fontWeight: 700,
                    letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}>
                    <span>📍</span> Thank You For Shopping With FlashKart <span>🥦</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── Style Helpers ────────────────────────────────────────────────────────────
const tdStyle = (align = 'center', color = '#222', fontWeight = 400) => ({
  padding: '4px 5px',
  fontSize: '11px',
  textAlign: align,
  color,
  fontWeight,
  border: '1px solid #D0E8D0',
  height: '22px'
});

const summaryLabelCell = (bg, color, bordered = false) => ({
  padding: '5px 8px',
  backgroundColor: bg,
  color,
  fontWeight: 800,
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
  border: bordered ? '1px solid #E0E0E0' : '1px solid #2E7D32',
  whiteSpace: 'nowrap'
});

const summaryValCell = (bg, color, isGrand = false, isGreen = false) => ({
  padding: '5px 10px',
  backgroundColor: bg,
  color,
  fontWeight: isGrand ? 900 : 700,
  fontSize: isGrand ? '12px' : '11px',
  textAlign: 'right',
  border: isGreen ? '1px solid #2E7D32' : '1px solid #E0E0E0',
  minWidth: '90px'
});

const toolBtn = (bg) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 18px',
  backgroundColor: bg,
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer'
});
