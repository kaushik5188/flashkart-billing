import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Check,
  Printer,
  MessageCircle,
  ChevronDown
} from 'lucide-react';

// ---- Autocomplete Vegetable Input Component ----
// Allows free-text typing while also suggesting existing catalog items
function VegInput({ value, onChange, onSuggestionSelect, products, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const wrapperRef = useRef(null);

  // Filter suggestions based on current query
  const suggestions = query.length >= 1
    ? products.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : products.slice(0, 8);

  // Sync external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    // Pass typed name up; product_id = null means custom/manual entry
    onChange(val, null, null);
  };

  const handleSelect = (prod) => {
    setQuery(prod.name);
    setOpen(false);
    onSuggestionSelect(prod);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flex: 2.2 }}>
      <input
        type="text"
        className="form-control"
        placeholder={placeholder || 'Type vegetable name...'}
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        style={{ paddingRight: '28px' }}
      />
      <ChevronDown
        size={14}
        style={{ position: 'absolute', right: '10px', top: '11px', color: 'var(--text-muted)', pointerEvents: 'none' }}
      />
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'var(--bg-card)',
          border: '1.5px solid var(--border-focus)',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 500,
          maxHeight: '220px',
          overflowY: 'auto',
          marginTop: '3px'
        }}>
          {/* Allow custom entry as first option */}
          {query && !products.find(p => p.name.toLowerCase() === query.toLowerCase()) && (
            <div
              onMouseDown={(e) => { e.preventDefault(); onChange(query, null, null); setOpen(false); }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                color: 'var(--color-orange-dark)',
                fontWeight: 600,
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={14} /> Use "{query}" (custom item)
            </div>
          )}
          {suggestions.length === 0 && query.length > 0 ? (
            <div style={{ padding: '10px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              No catalog match — item will be saved as typed
            </div>
          ) : (
            suggestions.map(prod => (
              <div
                key={prod.id}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(prod); }}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-green-light)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span>{prod.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  ₹{prod.selling_price}/{prod.unit} · Stock: {prod.stock_quantity.toFixed(0)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ---- Main Billing Component ----
export default function Billing({ token, API_URL, setInvoiceId, viewInvoiceId, setCustomerId, setView, editInvoiceId, onClearEdit }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});

  const [billNumber, setBillNumber] = useState('FK0001');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Each item: { product_id (nullable), product_name, quantity, rate, amount, remarks, unit }
  const [billItems, setBillItems] = useState([
    { product_id: null, product_name: '', quantity: '', rate: '', amount: 0, remarks: '', unit: 'Kg' }
  ]);
  
  const [discount, setDiscount] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successId, setSuccessId] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, [editInvoiceId]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [custRes, prodRes, billNumRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/api/customers`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/products`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/billing/next-bill-number`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/settings`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const [custData, prodData, billNumData, settData] = await Promise.all([
        custRes.json(), prodRes.json(), billNumRes.json(), settingsRes.json()
      ]);

      setCustomers(custData);
      setProducts(prodData);
      setSettings(settData);

      if (editInvoiceId) {
        const editRes = await fetch(`${API_URL}/api/billing/${editInvoiceId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const editData = await editRes.json();
        const inv = editData.invoice;
        const itms = editData.items;

        setBillNumber(inv.bill_number);
        setSelectedCustomerId(inv.customer_id.toString());
        setSelectedCustomer({ id: inv.customer_id, name: inv.customer_name, mobile: inv.customer_mobile, place: inv.customer_place, outstanding_balance: inv.previous_balance });
        setInvoiceDate(inv.invoice_date);
        setDiscount(inv.discount.toString());
        setPaidAmount(inv.paid_amount.toString());
        setPaymentMethod(inv.payment_method);
        setNotes(inv.notes || '');

        setBillItems(itms.map(i => ({
          product_id: i.product_id || null,
          product_name: i.product_name,
          quantity: i.quantity.toString(),
          rate: i.rate.toString(),
          amount: parseFloat(i.amount),
          remarks: i.remarks || '',
          unit: 'Kg'
        })));
      } else {
        setBillNumber(billNumData.billNumber);
        // Reset form for new bill
        setSelectedCustomerId('');
        setSelectedCustomer(null);
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setDiscount('0');
        setPaidAmount('0');
        setPaymentMethod('Cash');
        setNotes('');
        setBillItems([{ product_id: null, product_name: '', quantity: '', rate: '', amount: 0, remarks: '', unit: 'Kg' }]);
      }
    } catch (err) {
      setError('Error loading POS data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerChange = (id) => {
    setSelectedCustomerId(id);
    if (!id) { setSelectedCustomer(null); return; }
    const cust = customers.find(c => c.id === parseInt(id));
    setSelectedCustomer(cust || null);
  };

  // Called when user types freely in the VegInput
  const handleItemNameChange = (idx, typedName, productId, unit) => {
    const items = [...billItems];
    items[idx].product_name = typedName;
    items[idx].product_id = productId; // null for custom items
    if (unit) items[idx].unit = unit;
    // Recalculate amount
    const qty = parseFloat(items[idx].quantity || 0);
    const rate = parseFloat(items[idx].rate || 0);
    items[idx].amount = qty * rate;
    setBillItems(items);
  };

  // Called when user picks a suggestion from catalog autocomplete
  const handleItemSuggestionSelect = (idx, prod) => {
    const items = [...billItems];
    items[idx].product_name = prod.name;
    items[idx].product_id = prod.id;
    items[idx].unit = prod.unit;
    // Pre-fill rate if not already entered
    if (!items[idx].rate || items[idx].rate === '') {
      items[idx].rate = prod.selling_price.toString();
    }
    // Default qty to 1 if blank
    if (!items[idx].quantity) items[idx].quantity = '1';
    // Recalculate
    items[idx].amount = parseFloat(items[idx].quantity) * parseFloat(items[idx].rate);
    setBillItems(items);
  };

  // Handle qty/rate/remarks field changes
  const handleItemFieldChange = (idx, field, value) => {
    const items = [...billItems];
    items[idx][field] = value;
    const qty = parseFloat(items[idx].quantity || 0);
    const rate = parseFloat(items[idx].rate || 0);
    items[idx].amount = qty * rate;
    setBillItems(items);
  };

  const addBillItemRow = () => {
    setBillItems([...billItems, { product_id: null, product_name: '', quantity: '', rate: '', amount: 0, remarks: '', unit: 'Kg' }]);
  };

  const removeBillItemRow = (idx) => {
    if (billItems.length === 1) return;
    setBillItems(billItems.filter((_, i) => i !== idx));
  };

  // Totals
  const calculateTotals = () => {
    let subtotal = 0;
    let totalWeight = 0;
    billItems.forEach(item => {
      subtotal += item.amount;
      totalWeight += parseFloat(item.quantity || 0);
    });
    const disc = parseFloat(discount || 0);
    const prevBal = selectedCustomer ? selectedCustomer.outstanding_balance : 0;
    const grandTotal = subtotal - disc + prevBal;
    const paid = parseFloat(paidAmount || 0);
    const remaining = grandTotal - paid;
    return { subtotal, totalWeight, prevBal, grandTotal, remaining };
  };

  const { subtotal, totalWeight, prevBal, grandTotal, remaining } = calculateTotals();

  // Save invoice — custom-name items use product_id = 0
  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!selectedCustomerId) {
      setError('Please select a customer before saving.');
      setLoading(false);
      return;
    }

    const incomplete = billItems.find(i => !i.product_name.trim() || !i.quantity || !i.rate);
    if (incomplete) {
      setError('Please fill in vegetable name, quantity, and rate for every row.');
      setLoading(false);
      return;
    }

    const payload = {
      customer_id: parseInt(selectedCustomerId),
      invoice_date: invoiceDate,
      items: billItems.map(item => ({
        product_id: item.product_id || 0,   // 0 = custom/free-text item
        product_name: item.product_name.trim(),
        quantity: parseFloat(item.quantity),
        rate: parseFloat(item.rate),
        amount: item.amount,
        remarks: item.remarks || ''
      })),
      discount: parseFloat(discount || 0),
      previous_balance: prevBal,
      grand_total: grandTotal,
      paid_amount: parseFloat(paidAmount || 0),
      remaining_amount: remaining,
      payment_method: paymentMethod,
      notes
    };

    try {
      const method = editInvoiceId ? 'PUT' : 'POST';
      const url = editInvoiceId ? `${API_URL}/api/billing/${editInvoiceId}` : `${API_URL}/api/billing`;

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save invoice.');

      setSuccessId(data.invoiceId || editInvoiceId);
      
      // Clear edit mode state to allow new bills
      if (onClearEdit) onClearEdit();
      
      // Reset form
      setSelectedCustomerId('');
      setSelectedCustomer(null);
      setDiscount('0');
      setPaidAmount('0');
      setNotes('');
      setBillItems([{ product_id: null, product_name: '', quantity: '', rate: '', amount: 0, remarks: '', unit: 'Kg' }]);
      fetchInitialData(); // Refresh bill number
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade" style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr', gap: '1.5rem' }}>

      {/* LEFT: Billing creation board */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.85rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-green)' }}>
              {editInvoiceId ? '✏️ Edit Invoice' : 'Invoice Billing Desk'}
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type any vegetable name — catalog or custom</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Invoice Number</span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-orange-dark)' }}>{billNumber}</h3>
          </div>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', justifyContent: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSaveInvoice}>
          {/* Customer + Date Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Select Customer / Shop *</label>
              <select
                className="form-control"
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                required
              >
                <option value="">Select customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.mobile})</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Invoice Date</label>
              <input
                type="date"
                className="form-control"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Column headers */}
          <div style={{
            display: 'flex',
            gap: '8px',
            fontWeight: 700,
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            borderBottom: '1.5px solid var(--border-light)',
            paddingBottom: '6px',
            marginBottom: '8px'
          }}>
            <div style={{ flex: 2.2 }}>Vegetable Name <span style={{ fontWeight: 400, color: 'var(--color-orange)', fontSize: '0.75rem' }}>(type freely or pick from list)</span></div>
            <div style={{ flex: 1 }}>Qty</div>
            <div style={{ flex: 1 }}>Rate (₹)</div>
            <div style={{ flex: 1.2 }}>Amount</div>
            <div style={{ flex: 1.5 }}>Remarks</div>
            <div style={{ width: '36px' }}></div>
          </div>

          {/* Bill item rows */}
          {billItems.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>

              {/* ---- FREE-TEXT VEGETABLE INPUT with dropdown suggestions ---- */}
              <VegInput
                value={item.product_name}
                products={products}
                placeholder="e.g. Potato, Karela, Drumstick..."
                onChange={(name, pid, unit) => handleItemNameChange(idx, name, pid, unit)}
                onSuggestionSelect={(prod) => handleItemSuggestionSelect(idx, prod)}
              />

              {/* Quantity */}
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="form-control"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                  required
                />
                <span style={{ position: 'absolute', right: '6px', top: '9px', fontSize: '0.7rem', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                  {item.unit}
                </span>
              </div>

              {/* Rate */}
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control"
                  placeholder="Rate"
                  value={item.rate}
                  onChange={(e) => handleItemFieldChange(idx, 'rate', e.target.value)}
                  required
                />
              </div>

              {/* Calculated Amount */}
              <div style={{ flex: 1.2, fontWeight: 700, paddingLeft: '8px', fontSize: '0.95rem', color: item.amount > 0 ? 'var(--color-green-dark)' : 'var(--text-muted)' }}>
                ₹{item.amount.toFixed(2)}
              </div>

              {/* Remarks */}
              <div style={{ flex: 1.5 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Remarks"
                  value={item.remarks}
                  onChange={(e) => handleItemFieldChange(idx, 'remarks', e.target.value)}
                />
              </div>

              {/* Remove row */}
              <button
                type="button"
                onClick={() => removeBillItemRow(idx)}
                className="btn btn-secondary"
                style={{ padding: '8px', color: 'var(--color-danger)', flexShrink: 0 }}
                disabled={billItems.length === 1}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}

          {/* Add Row Button */}
          <button
            type="button"
            onClick={addBillItemRow}
            className="btn btn-secondary"
            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', marginTop: '6px', marginBottom: '1.25rem' }}
          >
            + Add Vegetable Line
          </button>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Billing Notes / Invoice Footer Text</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Includes transport charges, bulk discount applied"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', marginTop: '0.75rem', fontWeight: 800, fontSize: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Saving Invoice...' : (editInvoiceId ? `Update Invoice (₹${grandTotal.toFixed(2)})` : `Save & Finalize Invoice (₹${grandTotal.toFixed(2)})`)}
          </button>
        </form>
      </div>

      {/* RIGHT: Financial Summary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        <div className="glass-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
            Billing Calculations
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
              <strong>₹{subtotal.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Items Weight:</span>
              <span>{totalWeight.toFixed(1)} items/kg</span>
            </div>

            {/* Discount */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Discount (₹):</span>
              <input
                type="number"
                className="form-control"
                style={{ width: '90px', padding: '2px 6px', textAlign: 'right', fontSize: '0.85rem' }}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                min="0"
              />
            </div>

            {/* Previous Balance */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Previous Outstanding:</span>
              <strong style={{ color: 'var(--color-orange-dark)' }}>₹{prevBal.toFixed(2)}</strong>
            </div>

            {/* Grand Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid var(--border-light)', padding: '10px 0', borderBottom: '1.5px solid var(--border-light)' }}>
              <span style={{ fontWeight: 700, color: 'var(--color-green-dark)' }}>Grand Total:</span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--color-green-dark)', fontWeight: 800 }}>₹{grandTotal.toFixed(2)}</strong>
            </div>

            {/* Paid Amount */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '5px' }}>
              <span style={{ fontWeight: 600 }}>Paid Now (₹):</span>
              <input
                type="number"
                className="form-control"
                style={{ width: '100px', padding: '4px 8px', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem' }}
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                min="0"
              />
            </div>

            {/* Payment Mode */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Payment Mode:</span>
              <select
                className="form-control"
                style={{ width: '130px', padding: '2px 6px', fontSize: '0.85rem' }}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / PhonePe</option>
                <option value="Card">Card Swipe</option>
                <option value="Bank">Bank Transfer</option>
                <option value="Credit">Credit (Udhaar)</option>
              </select>
            </div>

            {/* Balance Remaining */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Balance (Baki):</span>
              <strong style={{ color: remaining > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 800 }}>
                ₹{remaining.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>

        {/* Customer Info Box */}
        {selectedCustomer && (
          <div className="glass-card" style={{ borderLeft: '4px solid var(--color-green)', padding: '1rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Selected Customer</h4>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              <strong>Name:</strong> {selectedCustomer.name}<br />
              <strong>Mobile:</strong> {selectedCustomer.mobile}<br />
              <strong>Place:</strong> {selectedCustomer.place || 'N/A'}<br />
              <strong>Outstanding Debt:</strong> <span style={{ color: selectedCustomer.outstanding_balance > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 700 }}>₹{selectedCustomer.outstanding_balance.toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={() => { setCustomerId(selectedCustomer.id); setView('customers'); }}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '0.75rem', padding: '4px', fontSize: '0.75rem' }}
            >
              View Full Ledger
            </button>
          </div>
        )}
      </div>

      {/* SUCCESS MODAL */}
      {successId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 300, padding: '1rem'
        }}>
          <div className="glass-card animate-slide" style={{
            width: '100%', maxWidth: '420px', textAlign: 'center', padding: '2.5rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)', backgroundColor: 'var(--bg-card)'
          }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%',
              backgroundColor: 'var(--color-green-light)', color: 'var(--color-green)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem'
            }}>
              <Check size={36} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-green-dark)', marginBottom: '0.5rem' }}>
              Invoice Saved Successfully!
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Bill saved permanently in the database and the customer ledger has been updated.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => { viewInvoiceId(successId); setSuccessId(null); }}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                <Printer size={16} /> Print / Download Invoice
              </button>
              <button
                onClick={() => setSuccessId(null)}
                className="btn btn-secondary"
                style={{ width: '100%' }}
              >
                Create Another Bill
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
