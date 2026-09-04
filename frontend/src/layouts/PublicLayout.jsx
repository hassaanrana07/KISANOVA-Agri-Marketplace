import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicNavbar from '../components/public/PublicNavbar';
import PublicFooter from '../components/public/PublicFooter';

const PublicLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <PublicNavbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
};

export default PublicLayout;
