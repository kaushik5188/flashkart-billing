import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Layers, 
  Truck, 
  History, 
  PlusCircle, 
  AlertTriangle,
  Upload,
  UserCheck
} from 'lucide-react';

export default function Inventory({ token, API_URL }) {
  const [activeTab, setActiveTab] = useState('products'); // 'products', 'adjust', 'purchases', 'suppliers', 'logs'
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [isSupModalOpen, setIsSupModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  // Vegetable Form Data
  const [prodForm, setProdForm] = useState({
    name: '',
    category: 'Vegetables',
    purchase_price: '',
    selling_price: '',
    unit: 'Kg',
    stock_quantity: '0',
    min_stock_alert: '20',
    barcode: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);

  // Supplier Form Data
  const [supForm, setSupForm] = useState({
    name: '',
    contact_person: '',
    mobile: '',
    address: ''
  });

  // Manual Stock Adjust Form Data
  const [adjustForm, setAdjustForm] = useState({
    product_id: '',
    type: 'IN',
    quantity: '',
    rate: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [adjustMsg, setAdjustMsg] = useState('');

  // Bulk Purchase Entry Form Data
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseItems, setPurchaseItems] = useState([{ product_id: '', quantity: '', rate: '' }]);
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [purchaseMsg, setPurchaseMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    setAdjustMsg('');
    setPurchaseMsg('');
    try {
      if (activeTab === 'products') {
        const res = await fetch(`${API_URL}/api/products?search=${searchQuery}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load products.');
        const data = await res.json();
        setProducts(data);
      } else if (activeTab === 'suppliers') {
        const res = await fetch(`${API_URL}/api/inventory/suppliers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load suppliers.');
        const data = await res.json();
        setSuppliers(data);
      } else if (activeTab === 'logs') {
        const res = await fetch(`${API_URL}/api/inventory/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load transaction history.');
        const data = await res.json();
        setLogs(data);
      } else if (activeTab === 'adjust' || activeTab === 'purchases') {
        // We need product list for selects
        const res = await fetch(`${API_URL}/api/products`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setProducts(data);

        if (activeTab === 'purchases') {
          const supRes = await fetch(`${API_URL}/api/inventory/suppliers`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const supData = await supRes.json();
          setSuppliers(supData);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  // Product Save (Formdata handles images upload)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setError('');
    
    const formData = new FormData();
    formData.append('name', prodForm.name);
    formData.append('category', prodForm.category);
    formData.append('purchase_price', prodForm.purchase_price);
    formData.append('selling_price', prodForm.selling_price);
    formData.append('unit', prodForm.unit);
    formData.append('min_stock_alert', prodForm.min_stock_alert);
    formData.append('barcode', prodForm.barcode);
    if (!editId) {
      formData.append('stock_quantity', prodForm.stock_quantity);
    }
    if (selectedFile) {
      formData.append('image', selectedFile);
    }

    try {
      const url = editId ? `${API_URL}/api/products/${editId}` : `${API_URL}/api/products`;
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to save product.');

      setIsProdModalOpen(false);
      setEditId(null);
      setSelectedFile(null);
      setProdForm({ name: '', category: 'Vegetables', purchase_price: '', selling_price: '', unit: 'Kg', stock_quantity: '0', min_stock_alert: '20', barcode: '' });
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditProductClick = (prod) => {
    setEditId(prod.id);
    setProdForm({
      name: prod.name,
      category: prod.category,
      purchase_price: prod.purchase_price.toString(),
      selling_price: prod.selling_price.toString(),
      unit: prod.unit,
      stock_quantity: prod.stock_quantity.toString(),
      min_stock_alert: prod.min_stock_alert.toString(),
      barcode: prod.barcode || ''
    });
    setIsProdModalOpen(true);
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete vegetable "${name}"?`)) return;
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete product.');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Supplier Save
  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const url = editId ? `${API_URL}/api/inventory/suppliers/${editId}` : `${API_URL}/api/inventory/suppliers`;
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(supForm)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to save supplier.');

      setIsSupModalOpen(false);
      setEditId(null);
      setSupForm({ name: '', contact_person: '', mobile: '', address: '' });
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditSupplierClick = (sup) => {
    setEditId(sup.id);
    setSupForm({
      name: sup.name,
      contact_person: sup.contact_person || '',
      mobile: sup.mobile,
      address: sup.address || ''
    });
    setIsSupModalOpen(true);
  };

  const handleDeleteSupplier = async (id, name) => {
    if (!window.confirm(`Delete supplier "${name}"?`)) return;
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/inventory/suppliers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete supplier.');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Manual Stock Adjust Submission
  const handleStockAdjust = async (e) => {
    e.preventDefault();
    setAdjustMsg('');
    setError('');
    if (!adjustForm.product_id || !adjustForm.quantity) return;

    try {
      const res = await fetch(`${API_URL}/api/inventory/stock-adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(adjustForm)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to adjust stock.');

      setAdjustMsg(`Stock updated successfully. Current stock: ${data.stock_quantity}`);
      setAdjustForm({
        product_id: '',
        type: 'IN',
        quantity: '',
        rate: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      setError(err.message);
    }
  };

  // Bulk Purchase Entry Handlers
  const handlePurchaseItemChange = (idx, field, value) => {
    const newItems = [...purchaseItems];
    newItems[idx][field] = value;
    
    // Auto-fill purchase price from select
    if (field === 'product_id' && value) {
      const prod = products.find(p => p.id === parseInt(value));
      if (prod) {
        newItems[idx]['rate'] = prod.purchase_price.toString();
      }
    }
    
    setPurchaseItems(newItems);
  };

  const addPurchaseItemRow = () => {
    setPurchaseItems([...purchaseItems, { product_id: '', quantity: '', rate: '' }]);
  };

  const removePurchaseItemRow = (idx) => {
    if (purchaseItems.length === 1) return;
    setPurchaseItems(purchaseItems.filter((_, i) => i !== idx));
  };

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    setPurchaseMsg('');
    setError('');

    if (!selectedSupplier || purchaseItems.some(i => !i.product_id || !i.quantity || !i.rate)) {
      setError('Please fill in all supplier and item details.');
      return;
    }

    // Calculate total amount
    let totalAmt = 0;
    const formattedItems = purchaseItems.map(item => {
      const qty = parseFloat(item.quantity);
      const r = parseFloat(item.rate);
      totalAmt += qty * r;
      return {
        product_id: parseInt(item.product_id),
        quantity: qty,
        rate: r
      };
    });

    try {
      const res = await fetch(`${API_URL}/api/inventory/purchase-entry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          supplier_id: parseInt(selectedSupplier),
          purchase_date: purchaseDate,
          items: formattedItems,
          total_amount: totalAmt,
          paid_amount: totalAmt, // Assumed paid fully
          payment_method: 'Cash',
          notes: purchaseNotes
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to submit purchase order.');

      setPurchaseMsg('Purchase order registered and product stocks updated!');
      setSelectedSupplier('');
      setPurchaseNotes('');
      setPurchaseItems([{ product_id: '', quantity: '', rate: '' }]);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="animate-fade">
      {/* Top Tabs Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Inventory & Stock Control</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage products catalog, suppliers, and purchase orders</p>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: '4px', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '3px', backgroundColor: 'var(--bg-card)' }}>
          <button onClick={() => setActiveTab('products')} className="btn" style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem', border: 'none', backgroundColor: activeTab === 'products' ? 'var(--color-green-light)' : 'transparent', color: activeTab === 'products' ? 'var(--color-green-dark)' : 'var(--text-main)' }}>
            <Layers size={14} /> Catalog
          </button>
          <button onClick={() => setActiveTab('adjust')} className="btn" style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem', border: 'none', backgroundColor: activeTab === 'adjust' ? 'var(--color-green-light)' : 'transparent', color: activeTab === 'adjust' ? 'var(--color-green-dark)' : 'var(--text-main)' }}>
            <PlusCircle size={14} /> Stock In/Out
          </button>
          <button onClick={() => setActiveTab('purchases')} className="btn" style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem', border: 'none', backgroundColor: activeTab === 'purchases' ? 'var(--color-green-light)' : 'transparent', color: activeTab === 'purchases' ? 'var(--color-green-dark)' : 'var(--text-main)' }}>
            <Truck size={14} /> Purchase Entry
          </button>
          <button onClick={() => setActiveTab('suppliers')} className="btn" style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem', border: 'none', backgroundColor: activeTab === 'suppliers' ? 'var(--color-green-light)' : 'transparent', color: activeTab === 'suppliers' ? 'var(--color-green-dark)' : 'var(--text-main)' }}>
            <UserCheck size={14} /> Suppliers
          </button>
          <button onClick={() => setActiveTab('logs')} className="btn" style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem', border: 'none', backgroundColor: activeTab === 'logs' ? 'var(--color-green-light)' : 'transparent', color: activeTab === 'logs' ? 'var(--color-green-dark)' : 'var(--text-main)' }}>
            <History size={14} /> Logs
          </button>
        </div>
      </div>

      {error && (
        <div className="badge badge-danger" style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
          {error}
        </div>
      )}

      {/* --- TAB CONTENT: VEGETABLE CATALOG --- */}
      {activeTab === 'products' && (
        <>
          {/* Catalog search and add */}
          <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <form onSubmit={handleProductSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '250px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search catalog by name, barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '38px', height: '38px' }}
                />
              </div>
              <button type="submit" className="btn btn-secondary">Search</button>
            </form>

            <button 
              onClick={() => { setEditId(null); setProdForm({ name: '', category: 'Vegetables', purchase_price: '', selling_price: '', unit: 'Kg', stock_quantity: '0', min_stock_alert: '20', barcode: '' }); setIsProdModalOpen(true); }} 
              className="btn btn-primary"
            >
              <Plus size={18} /> Add Vegetable
            </button>
          </div>

          {/* Catalog Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {products.map(prod => {
              const isLowStock = prod.stock_quantity <= prod.min_stock_alert;
              return (
                <div key={prod.id} className="glass-card" style={{ padding: '1.25rem', borderLeft: isLowStock ? '4px solid var(--color-orange)' : 'none' }}>
                  
                  {/* Vegetable Image Header */}
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-app)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-light)'
                    }}>
                      {prod.image_path ? (
                        <img src={`${API_URL}${prod.image_path}`} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '1.5rem', color: 'var(--color-green)' }}>🥦</span>
                      )}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{prod.name}</h3>
                      <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{prod.category}</span>
                    </div>
                  </div>

                  {/* Product details info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', marginBottom: '1.25rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Purchase Rate:</span>
                      <strong style={{ color: 'var(--text-main)' }}>₹{prod.purchase_price.toFixed(2)} / {prod.unit}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Selling Rate:</span>
                      <strong style={{ color: 'var(--color-green-dark)' }}>₹{prod.selling_price.toFixed(2)} / {prod.unit}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Current Stock:</span>
                      <strong style={{ color: isLowStock ? 'var(--color-orange-dark)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {prod.stock_quantity.toFixed(1)} {prod.unit}
                        {isLowStock && <AlertTriangle size={14} style={{ color: 'var(--color-orange)' }} />}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Alert Limit:</span>
                      <span>{prod.min_stock_alert} {prod.unit}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.85rem' }}>
                    <button onClick={() => handleEditProductClick(prod)} className="btn btn-secondary" style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem' }}>
                      <Edit size={14} /> Edit
                    </button>
                    <button onClick={() => handleDeleteProduct(prod.id, prod.name)} className="btn btn-secondary" style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', color: 'var(--color-danger)' }}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </>
      )}

      {/* --- TAB CONTENT: MANUAL STOCK IN/OUT --- */}
      {activeTab === 'adjust' && (
        <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PlusCircle size={20} style={{ color: 'var(--color-green)' }} /> Adjust Stock Level (Stock In / Stock Out)
          </h3>
          {adjustMsg && (
            <div className="badge badge-success" style={{ width: '100%', padding: '0.75rem', marginBottom: '1.25rem', justifyContent: 'center' }}>
              {adjustMsg}
            </div>
          )}

          <form onSubmit={handleStockAdjust}>
            <div className="form-group">
              <label className="form-label">Select Product / Vegetable *</label>
              <select 
                className="form-control"
                value={adjustForm.product_id}
                onChange={(e) => setAdjustForm({ ...adjustForm, product_id: e.target.value })}
                required
              >
                <option value="">Select vegetable...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Current Stock: {p.stock_quantity.toFixed(1)} {p.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Adjustment Type *</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                  <input 
                    type="radio" 
                    name="adjustType" 
                    value="IN" 
                    checked={adjustForm.type === 'IN'} 
                    onChange={() => setAdjustForm({ ...adjustForm, type: 'IN' })}
                  /> 
                  <span style={{ color: 'var(--color-success)' }}>Stock In (+)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                  <input 
                    type="radio" 
                    name="adjustType" 
                    value="OUT" 
                    checked={adjustForm.type === 'OUT'} 
                    onChange={() => setAdjustForm({ ...adjustForm, type: 'OUT' })}
                  /> 
                  <span style={{ color: 'var(--color-danger)' }}>Stock Out (-)</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input 
                  type="number" 
                  step="0.1" 
                  className="form-control"
                  placeholder="e.g. 50" 
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Rate per Unit (Optional)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-control"
                  placeholder="₹0.00" 
                  value={adjustForm.rate}
                  onChange={(e) => setAdjustForm({ ...adjustForm, rate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description / Remarks *</label>
              <input 
                type="text" 
                className="form-control"
                placeholder="e.g. Received new stock, spoiled disposal, retail transfer" 
                value={adjustForm.description}
                onChange={(e) => setAdjustForm({ ...adjustForm, description: e.target.value })}
                required 
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              Apply Stock Adjustment
            </button>
          </form>
        </div>
      )}

      {/* --- TAB CONTENT: PURCHASE ENTRY (SUPPLIERS BULK PURCHASE) --- */}
      {activeTab === 'purchases' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Truck size={20} style={{ color: 'var(--color-green)' }} /> Purchase Invoice Entry
          </h3>
          {purchaseMsg && (
            <div className="badge badge-success" style={{ width: '100%', padding: '0.75rem', marginBottom: '1.25rem', justifyContent: 'center' }}>
              {purchaseMsg}
            </div>
          )}

          <form onSubmit={handlePurchaseSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Select Supplier *</label>
                <select 
                  className="form-control"
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  required
                >
                  <option value="">Choose Supplier...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.contact_person || 'No contact'})</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Purchase Date *</label>
                <input 
                  type="date" 
                  className="form-control"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  required 
                />
              </div>
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '1.5rem 0 0.5rem 0', borderBottom: '1px solid var(--border-light)', paddingBottom: '4px' }}>
              Purchase Items Lines
            </h4>

            {purchaseItems.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                
                {/* Vegetable Picker */}
                <div style={{ flex: 2 }}>
                  <select
                    className="form-control"
                    value={item.product_id}
                    onChange={(e) => handlePurchaseItemChange(idx, 'product_id', e.target.value)}
                    required
                  >
                    <option value="">Select Vegetable...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                    ))}
                  </select>
                </div>

                {/* Qty Input */}
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handlePurchaseItemChange(idx, 'quantity', e.target.value)}
                    required
                  />
                </div>

                {/* Rate Input */}
                <div style={{ flex: 1.2 }}>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="Purchase Price (₹)"
                    value={item.rate}
                    onChange={(e) => handlePurchaseItemChange(idx, 'rate', e.target.value)}
                    required
                  />
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removePurchaseItemRow(idx)}
                  className="btn btn-secondary"
                  style={{ padding: '8px', color: 'var(--color-danger)' }}
                  disabled={purchaseItems.length === 1}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addPurchaseItemRow}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginTop: '0.5rem' }}
            >
              + Add Item Line
            </button>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label className="form-label">Purchase Order Notes</label>
              <textarea 
                className="form-control" 
                placeholder="e.g. Payment made fully in cash, fresh stock batch" 
                value={purchaseNotes}
                onChange={(e) => setPurchaseNotes(e.target.value)}
                rows={2}
                style={{ resize: 'none' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              Submit Purchase Entry
            </button>
          </form>
        </div>
      )}

      {/* --- TAB CONTENT: SUPPLIERS LIST --- */}
      {activeTab === 'suppliers' && (
        <>
          <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Active Vegetable Suppliers</h3>
            <button 
              onClick={() => { setEditId(null); setSupForm({ name: '', contact_person: '', mobile: '', address: '' }); setIsSupModalOpen(true); }} 
              className="btn btn-primary"
            >
              Add New Supplier
            </button>
          </div>

          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {suppliers.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No supplier profile records registered.</p>
            ) : (
              <div className="table-container" style={{ margin: 0, border: 'none' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Supplier Name</th>
                      <th>Contact Person</th>
                      <th>Mobile Number</th>
                      <th>Address</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map(sup => (
                      <tr key={sup.id}>
                        <td style={{ fontWeight: 700 }}>{sup.name}</td>
                        <td>{sup.contact_person || '-'}</td>
                        <td>{sup.mobile}</td>
                        <td>{sup.address || '-'}</td>
                        <td style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button onClick={() => handleEditSupplierClick(sup)} className="btn btn-secondary" style={{ padding: '6px' }} title="Edit">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDeleteSupplier(sup.id, sup.name)} className="btn btn-secondary" style={{ padding: '6px', color: 'var(--color-danger)' }} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* --- TAB CONTENT: STOCK CARD LOG --- */}
      {activeTab === 'logs' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {logs.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No stock transactions registered yet.</p>
          ) : (
            <div className="table-container" style={{ margin: 0, border: 'none' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Timestamp Date</th>
                    <th>Vegetable Name</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Quantity</th>
                    <th style={{ textAlign: 'right' }}>Rate (₹)</th>
                    <th>Doc Ref</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td>{log.transaction_date}</td>
                      <td style={{ fontWeight: 700 }}>{log.product_name}</td>
                      <td>{log.product_category}</td>
                      <td>
                        <span className={`badge ${
                          log.type === 'IN' || log.type === 'PURCHASE' ? 'badge-success' : 'badge-danger'
                        }`} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          {log.type === 'IN' || log.type === 'PURCHASE' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}
                          {log.type}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{log.quantity.toFixed(1)} {log.product_unit}</td>
                      <td style={{ textAlign: 'right' }}>{log.rate > 0 ? `₹${log.rate.toFixed(2)}` : '-'}</td>
                      <td style={{ fontWeight: 600 }}>{log.reference_id || '-'}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- MODAL DIALOGS --- */}

      {/* Vegetable Form Modal */}
      {isProdModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '1rem'
        }}>
          <div className="glass-card animate-slide" style={{
            width: '100%',
            maxWidth: '520px',
            backgroundColor: 'var(--bg-card)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontWeight: 800 }}>
              {editId ? 'Modify Product Entry' : 'Add Fresh Produce Vegetable'}
            </h3>
            
            <form onSubmit={handleSaveProduct}>
              <div className="form-group">
                <label className="form-label">Vegetable Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Potato (બટાકા)"
                  value={prodForm.name}
                  onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select 
                    className="form-control"
                    value={prodForm.category}
                    onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}
                  >
                    <option value="Vegetables">Vegetables (શાકભાજી)</option>
                    <option value="Fruits">Fruits (ફળો)</option>
                    <option value="Leafy">Leafy Greens (ભાજી)</option>
                    <option value="Spices">Spices & Herbs (મસાલા)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Selling Unit</label>
                  <select 
                    className="form-control"
                    value={prodForm.unit}
                    onChange={(e) => setProdForm({ ...prodForm, unit: e.target.value })}
                  >
                    <option value="Kg">Kg</option>
                    <option value="Bunch">Bunch (જુડી)</option>
                    <option value="Crate">Crate (કેરેટ)</option>
                    <option value="Dozen">Dozen</option>
                    <option value="Piece">Piece (નંગ)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Purchase Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="₹15.00"
                    value={prodForm.purchase_price}
                    onChange={(e) => setProdForm({ ...prodForm, purchase_price: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="₹25.00"
                    value={prodForm.selling_price}
                    onChange={(e) => setProdForm({ ...prodForm, selling_price: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {!editId && (
                  <div className="form-group">
                    <label className="form-label">Initial Stock Quantity</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={prodForm.stock_quantity}
                      onChange={(e) => setProdForm({ ...prodForm, stock_quantity: e.target.value })}
                    />
                  </div>
                )}
                
                <div className="form-group" style={{ gridColumn: editId ? 'span 2' : 'span 1' }}>
                  <label className="form-label">Minimum Stock Alert Threshold</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    value={prodForm.min_stock_alert}
                    onChange={(e) => setProdForm({ ...prodForm, min_stock_alert: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Barcode / SKU (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Scan or type barcode"
                  value={prodForm.barcode}
                  onChange={(e) => setProdForm({ ...prodForm, barcode: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Product Image (Max 2MB)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  style={{ display: 'none' }}
                  id="imageUploadInput"
                />
                <label 
                  htmlFor="imageUploadInput"
                  className="form-control"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    border: '1.5px dashed var(--border-light)',
                    padding: '1.5rem',
                    borderRadius: '8px'
                  }}
                >
                  <Upload size={20} style={{ color: 'var(--color-green)' }} />
                  {selectedFile ? selectedFile.name : 'Click to select item picture'}
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsProdModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  {editId ? 'Save Updates' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Form Modal */}
      {isSupModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '1rem'
        }}>
          <div className="glass-card animate-slide" style={{
            width: '100%',
            maxWidth: '460px',
            backgroundColor: 'var(--bg-card)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontWeight: 800 }}>
              {editId ? 'Modify Supplier Profile' : 'Register Supplier Account'}
            </h3>
            
            <form onSubmit={handleSaveSupplier}>
              <div className="form-group">
                <label className="form-label">Supplier / Company Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Ganesh Fruit Farms"
                  value={supForm.name}
                  onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Person Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Ramesh Patel"
                  value={supForm.contact_person}
                  onChange={(e) => setSupForm({ ...supForm, contact_person: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 9988776655"
                  value={supForm.mobile}
                  onChange={(e) => setSupForm({ ...supForm, mobile: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Supplier Address</label>
                <textarea
                  className="form-control"
                  placeholder="Enter address details"
                  value={supForm.address}
                  onChange={(e) => setSupForm({ ...supForm, address: e.target.value })}
                  rows={2}
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsSupModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  {editId ? 'Save Changes' : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
