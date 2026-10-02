import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Footer from './Footer';
import { useAuth } from '../../context/AuthContext';

const AppLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const role = user?.role;
    let pageTitle = 'FleetHub | Food Delivery Fleet';
    if (role === 'SUPER_ADMIN') {
      pageTitle = 'FleetHub | Super Admin';
    } else if (role === 'ADMIN') {
      pageTitle = 'FleetHub | Admin';
    } else if (role === 'CLIENT') {
      pageTitle = 'FleetHub | Client';
    } else if (role === 'DRIVER') {
      pageTitle = 'FleetHub | Driver';
    }
    document.title = pageTitle;
    setMobileMenuOpen(false);
  }, [user?.role, location.pathname]);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      {/* 1. Fixed Top Navbar (height: 64px, z-index: 50) */}
      <Topbar
        mobileOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
      />

      {/* 2. Responsive Sidebar (Desktop fixed 240px below navbar, Mobile slide-out drawer) */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* 3. Main Content: pt-16 (for 64px navbar), md:ml-60 (for 240px desktop sidebar), ml-0 on mobile */}
      <main className="flex-1 pt-16 md:ml-60 min-w-0 overflow-x-hidden flex flex-col justify-between">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>

        {/* 4. Professional Responsive Footer */}
        <Footer />
      </main>
    </div>
  );
};

export default AppLayout;
