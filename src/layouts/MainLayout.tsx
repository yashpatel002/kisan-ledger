import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Users, Briefcase, Settings, BarChart2, Layers } from 'lucide-react';
import clsx from 'clsx';

const MainLayout: React.FC = () => {
    const { t } = useTranslation();

    const navItems = [
        { to: '/', icon: Home, label: t('dashboard') },
        { to: '/clients', icon: Users, label: t('clients') },
        { to: '/jobs', icon: Briefcase, label: t('jobs') },
        { to: '/operations', icon: Layers, label: t('operations') },
        { to: '/reports', icon: BarChart2, label: t('reports') },
        { to: '/settings', icon: Settings, label: t('settings') },
    ];

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <main className="flex-1 overflow-y-auto pb-20 p-4">
                <Outlet />
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-pb">
                <div className="flex justify-around items-center h-16">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                clsx(
                                    'flex flex-col items-center justify-center w-full h-full space-y-1',
                                    isActive ? 'text-green-600' : 'text-gray-500 hover:text-green-500'
                                )
                            }
                        >
                            <Icon size={24} />
                            <span className="text-[10px] font-medium">{label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>
        </div>
    );
};

export default MainLayout;
