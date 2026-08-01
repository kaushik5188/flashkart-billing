import React, { useState, useEffect } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import PrintInvoice from './components/PrintInvoice';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Ledger from './pages/Ledger';
import UsersPage from './pages/Users';
import Expenses from './pages/Expenses';
import Bills from './pages/Bills';
import Purchases from './pages/Purchases';
import Suppliers from './pages/Suppliers';

const API_URL = 'http://localhost:5000';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('fk_token') || null);
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('fk_user');
    return u ? JSON.parse(u) : null;
  });
  const [currentView, setCurrentView] = useState('dashboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('fk_theme') || 'light');

  // Cross-page navigation states
  const [activeCustomerId, setActiveCustomerId] = useState(null);
  const [activeInvoiceId, setActiveInvoiceId] = useState(null);
  const [editInvoiceId, setEditInvoiceId] = useState(null);

  // Apply theme to root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fk_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const logout = () => {
    localStorage.removeItem('fk_token');
    localStorage.removeItem('fk_user');
    setToken(null);
    setUser(null);
    setCurrentView('dashboard');
    setActiveCustomerId(null);
    setActiveInvoiceId(null);
  };

  const handleSetView = (view) => {
    setCurrentView(view);
    // Reset cross-page drill-down when switching views
    if (view !== 'customers') setActiveCustomerId(null);
    if (view !== 'billing') setActiveInvoiceId(null);
  };

  // Used by Billing page success overlay to open PrintInvoice
  const viewInvoiceId = (id) => {
    setActiveInvoiceId(id);
  };

  // If not logged in, show Login screen
  if (!token) {
    return (
      <div data-theme={theme}>
        <Login
          setToken={setToken}
          setUser={setUser}
          API_URL={API_URL}
        />
      </div>
    );
  }

  return (
    <div className="app-container" data-theme={theme}>
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        setView={handleSetView}
        user={user}
        logout={logout}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {currentView === 'dashboard' && (
          <Dashboard
            setView={handleSetView}
            token={token}
            API_URL={API_URL}
            setCustomerId={setActiveCustomerId}
          />
        )}

        {currentView === 'billing' && (
          <Billing
            token={token}
            API_URL={API_URL}
            setInvoiceId={setActiveInvoiceId}
            viewInvoiceId={viewInvoiceId}
            setCustomerId={setActiveCustomerId}
            setView={handleSetView}
            editInvoiceId={editInvoiceId}
            onClearEdit={() => setEditInvoiceId(null)}
          />
        )}

        {currentView === 'customers' && (
          <Customers
            customerId={activeCustomerId}
            setCustomerId={setActiveCustomerId}
            token={token}
            API_URL={API_URL}
            setInvoiceId={setActiveInvoiceId}
          />
        )}

        {currentView === 'inventory' && (
          <Inventory
            token={token}
            API_URL={API_URL}
          />
        )}

        {currentView === 'reports' && (
          <Reports
            token={token}
            API_URL={API_URL}
            setCustomerId={setActiveCustomerId}
            setView={handleSetView}
          />
        )}

        {currentView === 'settings' && (
          <Settings
            token={token}
            API_URL={API_URL}
            user={user}
          />
        )}

        {currentView === 'ledger' && (
          <Ledger
            token={token}
            API_URL={API_URL}
            user={user}
          />
        )}

        {currentView === 'users' && (
          <UsersPage
            token={token}
            API_URL={API_URL}
            user={user}
          />
        )}

        {currentView === 'expenses' && (
          <Expenses
            token={token}
            API_URL={API_URL}
            user={user}
          />
        )}

        {currentView === 'purchases' && (
          <Purchases
            token={token}
            API_URL={API_URL}
            user={user}
          />
        )}

        {currentView === 'suppliers' && (
          <Suppliers
            token={token}
            API_URL={API_URL}
            user={user}
          />
        )}

        {currentView === 'bills' && (
          <Bills
            token={token}
            API_URL={API_URL}
            onPrintBill={(b) => setActiveInvoiceId(b.id)}
            onEditBill={(id) => {
              setEditInvoiceId(id);
              setCurrentView('billing');
            }}
          />
        )}
      </main>

      {/* Global Print Invoice Overlay */}
      {activeInvoiceId && (
        <PrintInvoice
          invoiceId={activeInvoiceId}
          token={token}
          API_URL={API_URL}
          onClose={() => setActiveInvoiceId(null)}
        />
      )}
    </div>
  );
}
