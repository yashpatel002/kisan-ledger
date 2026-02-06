import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { RefreshCw, Plus, TrendingUp, TrendingDown, AlertCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

const Dashboard: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const todayStr = new Date().toISOString().split('T')[0];

    const stats = useLiveQuery(async () => {
        const jobs = await db.jobs.toArray();
        const expenses = await db.expenses.toArray();
        const payments = await db.payments.toArray();

        // Today Income (Payments received today)
        const todayIncome = payments
            .filter(p => p.date === todayStr)
            .reduce((sum, p) => sum + p.amount, 0);

        // Today Expense
        const todayExpense = expenses
            .filter(e => e.date === todayStr)
            .reduce((sum, e) => sum + e.amount, 0);

        // Pending Money (Total Job Amount - Total Paid Amount)
        const totalJobAmount = jobs.reduce((sum, j) => sum + j.amount, 0);
        const totalPaidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
        const pendingMoney = totalJobAmount - totalPaidAmount;

        // Overdue Jobs Amount
        const overdueJobs = jobs.filter(j => j.status === 'overdue');
        // Calculate overdue balance strictly
        const overdueAmount = overdueJobs.reduce((sum, j) => {
            const paid = payments.filter(p => p.jobId === j.id).reduce((s, p) => s + p.amount, 0);
            return sum + (j.amount - paid);
        }, 0);

        return { todayIncome, todayExpense, pendingMoney, overdueAmount, pendingCount: jobs.filter(j => j.status === 'pending' || j.status === 'partial').length };
    }, [], { todayIncome: 0, todayExpense: 0, pendingMoney: 0, overdueAmount: 0, pendingCount: 0 });

    const recentActivity = useLiveQuery(async () => {
        // Combine jobs and payments for activity feed
        const jobs = await db.jobs.limit(5).reverse().toArray();
        // Getting client names
        const clientIds = jobs.map(j => j.clientId);
        const clients = await db.clients.where('id').anyOf(clientIds).toArray();
        const clientMap = new Map(clients.map(c => [c.id, c.name]));

        return jobs.map(j => ({
            type: 'job',
            id: j.id,
            title: clientMap.get(j.clientId) || 'Unknown Client',
            amount: j.amount,
            date: j.date,
            status: j.status
        }));
    });

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 500);
    };

    return (
        <div className="space-y-6 pb-20">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{t('dashboard')}</h1>
                    <p className="text-gray-500 text-sm">{format(new Date(), 'EEEE, dd MMM yyyy')}</p>
                </div>
                <button
                    onClick={handleRefresh}
                    className={`p-2 bg-white rounded-full shadow hover:bg-gray-100 ${isRefreshing ? 'animate-spin' : ''}`}
                >
                    <RefreshCw size={20} className="text-green-600" />
                </button>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-green-100 rounded-lg text-green-600"><TrendingUp size={16} /></div>
                        <p className="text-gray-500 text-xs font-medium">TODAY INCOME</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">₹{stats?.todayIncome}</p>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-red-100 rounded-lg text-red-500"><TrendingDown size={16} /></div>
                        <p className="text-gray-500 text-xs font-medium">TODAY EXPENSE</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">₹{stats?.todayExpense}</p>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-amber-100 rounded-lg text-amber-500"><Clock size={16} /></div>
                        <p className="text-gray-500 text-xs font-medium">TOTAL PENDING</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">₹{stats?.pendingMoney}</p>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-red-100 rounded-lg text-red-600"><AlertCircle size={16} /></div>
                        <p className="text-gray-500 text-xs font-medium">TOTAL OVERDUE</p>
                    </div>
                    <p className="text-2xl font-bold text-red-600">₹{stats?.overdueAmount}</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => navigate('/jobs')}
                    className="bg-green-600 text-white p-4 rounded-xl shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center gap-2"
                >
                    <div className="bg-white/20 p-2 rounded-full"><Plus size={24} /></div>
                    <span className="font-semibold">Add Job</span>
                </button>
                <button
                    onClick={() => navigate('/expenses')}
                    className="bg-red-500 text-white p-4 rounded-xl shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center gap-2"
                >
                    <div className="bg-white/20 p-2 rounded-full"><Plus size={24} /></div>
                    <span className="font-semibold">Add Expense</span>
                </button>
            </div>

            {/* Secondary Actions */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => navigate('/jobs')}
                    className="bg-white text-gray-700 p-3 rounded-xl border border-gray-200 shadow-sm active:scale-95 transition-transform text-sm font-medium"
                >
                    Record Payment
                </button>
                <button
                    onClick={() => navigate('/jobs')} // Ideally filtering by overdue
                    className="bg-white text-red-600 p-3 rounded-xl border border-red-100 shadow-sm active:scale-95 transition-transform text-sm font-medium"
                >
                    View Overdue ({stats?.overdueAmount > 0 ? '!' : '0'})
                </button>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-700">Recent Jobs</h2>
                    <button onClick={() => navigate('/jobs')} className="text-green-600 text-xs font-bold uppercase">View All</button>
                </div>
                <div className="divide-y divide-gray-50">
                    {recentActivity?.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No jobs yet</div>
                    ) : (
                        recentActivity?.map(item => (
                            <div key={item.id} className="p-4 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-gray-800">{item.title}</h4>
                                    <span className="text-xs text-gray-400">{format(parseISO(item.date), 'dd MMM')}</span>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold">₹{item.amount}</div>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${item.status === 'paid' ? 'bg-green-100 text-green-700' :
                                        item.status === 'pending' ? 'bg-gray-100 text-gray-600' :
                                            item.status === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                                        }`}>{item.status}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
