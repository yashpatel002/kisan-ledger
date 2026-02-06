import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays } from 'date-fns';

const Reports: React.FC = () => {
    const { t } = useTranslation();
    // const [dateRange, setDateRange] = useState('30'); // Unused for now

    // Fetch data
    const data = useLiveQuery(async () => {
        const jobs = await db.jobs.toArray();
        const expenses = await db.expenses.toArray();
        const payments = await db.payments.toArray();

        // Calculate totals based on filters could be advanced, for now generic totals
        const totalJobs = jobs.reduce((sum, j) => sum + j.amount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
        // const profit = totalJobs - totalExpenses; // Unused 
        // Cash Flow Profit = Collected - Expenses
        const cashInHand = totalCollected - totalExpenses;

        // Chart Data: Last 7 days income vs expense
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const dateStr = format(date, 'yyyy-MM-dd');

            const dayIncome = payments.filter(p => p.date === dateStr).reduce((s, p) => s + p.amount, 0);
            const dayExpense = expenses.filter(e => e.date === dateStr).reduce((s, e) => s + e.amount, 0);

            chartData.push({
                name: format(date, 'dd MMM'),
                income: dayIncome,
                expense: dayExpense
            });
        }

        return { totalJobs, totalExpenses, totalCollected, cashInHand, chartData };
    });

    return (
        <div className="pb-20">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('reports')}</h1>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-xs font-medium uppercase">Total Revenue (Job Value)</p>
                    <p className="text-xl font-bold text-blue-600">₹{data?.totalJobs || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-xs font-medium uppercase">Total Expenses</p>
                    <p className="text-xl font-bold text-red-600">₹{data?.totalExpenses || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-xs font-medium uppercase">Actually Collected</p>
                    <p className="text-xl font-bold text-green-600">₹{data?.totalCollected || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-xs font-medium uppercase">Cash Balance</p>
                    <p className={`text-xl font-bold ${data?.cashInHand && data.cashInHand >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        ₹{data?.cashInHand || 0}
                    </p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                <h3 className="font-bold text-gray-700 mb-4">Last 7 Days Cash Flow</h3>
                <div className="h-64 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data?.chartData || []}>
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="income" fill="#16a34a" name="Income" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="text-center text-gray-400 text-sm">
                More detailed reports coming soon.
            </div>
        </div>
    );
};

export default Reports;
