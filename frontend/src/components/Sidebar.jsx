import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  Boxes, 
  BarChart3, 
  Settings as SettingsIcon, 
  LogOut, 
  Sprout, 
  Sun, 
  Moon,
  BookOpen,
  UserCog,
  Wallet,
  FileText,
  ShoppingCart,
  Truck
} from 'lucide-react';

export default function Sidebar({ currentView, setView, user, logout, theme, toggleTheme }) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'billing', name: 'New Bill', icon: Receipt },
    { id: 'bills', name: 'All Bills', icon: FileText },
    { id: 'purchases', name: 'Purchases', icon: ShoppingCart },
    { id: 'customers', name: 'Customers', icon: Users },
    { id: 'expenses', name: 'Expenses', icon: Wallet },
    { id: 'reports', name: 'Reports', icon: BarChart3 },
    ...(user?.role === 'admin' ? [
      { id: 'ledger', name: 'Ledger', icon: BookOpen },
      { id: 'settings', name: 'Settings', icon: SettingsIcon },
      { id: 'users', name: 'Users', icon: UserCog }
    ] : [])
  ];

  return (
    <aside className="sidebar-container" style={{
      width: '260px',
      backgroundColor: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-light)',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '1.5rem',
      zIndex: 100,
      transition: 'var(--transition-smooth)'
    }}>
      {/* Brand Header */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '2rem',
          padding: '0.5rem 0'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: 'var(--color-green-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-green)'
          }}>
            <Sprout size={24} />
          </div>
          <div>
            <h2 style={{
              fontSize: '1.25rem',
              color: 'var(--color-green)',
              fontWeight: 800,
              lineHeight: 1
            }}>FLASHKART</h2>
            <span style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              fontWeight: 600,
              display: 'block',
              marginTop: '2px'
            }}>Fruits & Vegetables</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isActive ? 'var(--color-green-light)' : 'transparent',
                  color: isActive ? 'var(--color-green-dark)' : 'var(--text-main)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--color-green)' : 'var(--text-muted)' }} />
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Area with Theme Toggle & Logout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '0.6rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid var(--border-light)',
            backgroundColor: 'transparent',
            color: 'var(--text-main)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </span>
          <span style={{
            fontSize: '0.75rem',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--border-light)',
            color: 'var(--text-muted)'
          }}>Toggle</span>
        </button>

        {/* User Card */}
        <div style={{
          padding: '0.85rem',
          borderRadius: '12px',
          backgroundColor: 'rgba(46, 125, 50, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'capitalize' }}>
              {user ? user.username : 'Admin'}
            </h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              {user ? user.role : 'Owner'}
            </span>
          </div>
          <button
            onClick={logout}
            title="Logout"
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--color-danger)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
              borderRadius: '4px'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
