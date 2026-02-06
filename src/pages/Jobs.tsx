
import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Job, type Payment } from '../db';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Banknote, X } from 'lucide-react';
import { format, addDays, isAfter, parseISO, subDays } from 'date-fns';
import clsx from 'clsx';
import Dropdown from '../components/Dropdown';

const Jobs: React.FC = () => {
    const { t } = useTranslation();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('all'); // 'all', '7days', '30days', '3months', 'year'
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'paid', 'pending', 'partial', 'overdue'

    const [expandedJobId, setExpandedJobId] = useState<number | null>(null);

    // Data for adding job
    const [selectedJobForPayment, setSelectedJobForPayment] = useState<Job | null>(null);

    const [jobFormData, setJobFormData] = useState<Job>({
        date: new Date().toISOString().split('T')[0],
        clientId: 0,
        operationTypeId: 0,
        type: 'hourly',
        rate: 0,
        quantity: 1,
        amount: 0,
        paymentType: 'credit',
        dueDays: 30,
        dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        status: 'pending',
    });

    const [paymentFormData, setPaymentFormData] = useState<Payment>({
        jobId: 0,
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        method: 'cash',
        notes: '',
    });

    const clients = useLiveQuery(() => db.clients.toArray());
    const operations = useLiveQuery(() => db.operationTypes.toArray());
    const payments = useLiveQuery(() => db.payments.toArray());

    const jobs = useLiveQuery(async () => {
        let collection = await db.jobs.reverse().toArray();

        // 1. Filter by Client Name (Search)
        if (searchTerm) {
            const clientIds = await db.clients
                .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .keys();
            collection = collection.filter(j => clientIds.includes(j.clientId));
        }

        // 2. Filter by Date
        const now = new Date();
        if (dateFilter !== 'all') {
            collection = collection.filter(j => {
                const jobDate = parseISO(j.date);
                if (dateFilter === '7days') return isAfter(jobDate, subDays(now, 7));
                if (dateFilter === '30days') return isAfter(jobDate, subDays(now, 30));
                if (dateFilter === '3months') return isAfter(jobDate, subDays(now, 90));
                if (dateFilter === 'year') return isAfter(jobDate, subDays(now, 365));
                return true;
            });
        }

        // 3. Filter by Status (Needs Payment Calculation)
        if (statusFilter !== 'all') {
            const allPayments = await db.payments.toArray();
            // Pre-calculate payments for performance
            const paymentsByJob = allPayments.reduce((acc, p) => {
                acc[p.jobId] = (acc[p.jobId] || 0) + p.amount;
                return acc;
            }, {} as Record<number, number>);

            collection = collection.filter(j => {
                const jobPaid = paymentsByJob[j.id!] || 0;
                const balance = j.amount - jobPaid;

                let displayStatus = 'pending';
                if (balance <= 0) displayStatus = 'paid';
                else if (jobPaid > 0) displayStatus = 'partial';
                else if (isAfter(new Date(), parseISO(j.dueDate))) displayStatus = 'overdue';

                return displayStatus === statusFilter;
            });
        }

        return collection;
    }, [searchTerm, dateFilter, statusFilter]);

    // Calculations
    useEffect(() => {
        const amount = jobFormData.rate * jobFormData.quantity;
        const dueDate = format(addDays(new Date(jobFormData.date), jobFormData.dueDays), 'yyyy-MM-dd');
        setJobFormData(prev => ({
            ...prev,
            amount,
            dueDate,
            status: prev.paymentType === 'immediate' ? 'paid' : 'pending'
        }));
    }, [jobFormData.rate, jobFormData.quantity, jobFormData.date, jobFormData.dueDays, jobFormData.paymentType]);

    const handleOperationChange = (opId: number) => {
        const op = operations?.find(o => o.id === opId);
        if (op) {
            setJobFormData({
                ...jobFormData,
                operationTypeId: opId,
                type: op.type,
                rate: op.defaultRate
            });
        }
    };

    const handleClientChange = (clientId: number) => {
        const client = clients?.find(c => c.id === clientId);
        if (client) {
            setJobFormData(prev => ({
                ...prev,
                clientId,
                dueDays: client.defaultDueDays || 30
            }));
        }
    };

    const handleJobSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const jobId = await db.jobs.add(jobFormData);

        if (jobFormData.paymentType === 'immediate') {
            await db.payments.add({
                jobId: jobId as number,
                amount: jobFormData.amount,
                date: jobFormData.date,
                method: 'cash',
                notes: 'Immediate payment'
            });
        }

        setIsAddModalOpen(false);
        resetJobForm();
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await db.payments.add(paymentFormData);

        if (selectedJobForPayment && selectedJobForPayment.id) {
            const jobPayments = await db.payments.where('jobId').equals(selectedJobForPayment.id).toArray();
            const totalPaid = jobPayments.reduce((sum, p) => sum + p.amount, 0) + paymentFormData.amount;

            let newStatus: 'paid' | 'partial' | 'pending' | 'overdue' = 'pending';
            if (totalPaid >= selectedJobForPayment.amount) newStatus = 'paid';
            else if (totalPaid > 0) newStatus = 'partial';

            if (newStatus !== 'paid' && isAfter(new Date(), parseISO(selectedJobForPayment.dueDate))) {
                newStatus = 'overdue';
            }

            await db.jobs.update(selectedJobForPayment.id, { status: newStatus });
        }

        setIsPaymentModalOpen(false);
        setPaymentFormData({
            jobId: 0,
            amount: 0,
            date: new Date().toISOString().split('T')[0],
            method: 'cash',
            notes: '',
        });
    };

    const openPaymentModal = (job: Job) => {
        setSelectedJobForPayment(job);
        const jobPaid = payments?.filter(p => p.jobId === job.id).reduce((sum, p) => sum + p.amount, 0) || 0;
        const remaining = job.amount - jobPaid;

        setPaymentFormData({
            jobId: job.id!,
            amount: remaining,
            date: new Date().toISOString().split('T')[0],
            method: 'cash',
            notes: ''
        });
        setIsPaymentModalOpen(true);
    };

    const resetJobForm = () => {
        setJobFormData({
            date: new Date().toISOString().split('T')[0],
            clientId: 0,
            operationTypeId: 0,
            type: 'hourly',
            rate: 0,
            quantity: 1,
            amount: 0,
            paymentType: 'credit',
            dueDays: 30,
            dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
            status: 'pending',
        });
    };

    const getClientName = (id: number) => clients?.find(c => c.id === id)?.name || 'Unknown';
    const getOpName = (id: number) => operations?.find(o => o.id === id)?.name; // Return undefined if not found
    const getJobPaidAmount = (jobId: number) => payments?.filter(p => p.jobId === jobId).reduce((sum, p) => sum + p.amount, 0) || 0;

    return (
        <div className="pb-24">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">{t('jobs')}</h1>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md active:scale-95 transition-transform"
                >
                    <Plus size={20} />
                    {t('add_new')}
                </button>
            </header>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search Client..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div>
                    <Dropdown
                        value={dateFilter}
                        onChange={setDateFilter}
                        options={[
                            { value: 'all', label: 'Any Time' },
                            { value: '7days', label: 'Last 7 Days' },
                            { value: '30days', label: 'Last 30 Days' },
                            { value: '3months', label: 'Last 3 Months' }
                        ]}
                    />
                </div>
                <div>
                    <Dropdown
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={[
                            { value: 'all', label: 'Any Status' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'partial', label: 'Partial' },
                            { value: 'paid', label: 'Paid' },
                            { value: 'overdue', label: 'Overdue' }
                        ]}
                    />
                </div>
            </div>

            <div className="space-y-4">
                {jobs?.map(job => {
                    const paidAmount = getJobPaidAmount(job.id!);
                    const balance = job.amount - paidAmount;
                    const isExpanded = expandedJobId === job.id;
                    const opName = getOpName(job.operationTypeId);

                    // Dynamic Status Calculation to fix incorrect DB status
                    let displayStatus = 'pending';
                    if (balance <= 0) displayStatus = 'paid';
                    else if (paidAmount > 0) displayStatus = 'partial';
                    else if (isAfter(new Date(), parseISO(job.dueDate))) displayStatus = 'overdue';

                    return (
                        <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div
                                className="p-4 flex justify-between items-start cursor-pointer"
                                onClick={() => setExpandedJobId(isExpanded ? null : job.id!)}
                            >
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">{getClientName(job.clientId)}</h3>
                                    <div className="flex items-center text-gray-500 text-sm mt-1">
                                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded mr-2">{opName || 'Regular'}</span>
                                        <span className="mr-2">{format(parseISO(job.date), 'dd MMM')}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-lg">₹{job.amount}</div>
                                    <div className={clsx(
                                        "text-xs font-bold px-2 py-0.5 rounded inline-block mt-1 uppercase",
                                        displayStatus === 'paid' ? "bg-green-100 text-green-700" :
                                            displayStatus === 'overdue' ? "bg-red-100 text-red-700" :
                                                displayStatus === 'partial' ? "bg-amber-100 text-amber-700" :
                                                    "bg-gray-100 text-gray-700"
                                    )}>
                                        {displayStatus}
                                    </div>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="bg-gray-50 p-4 border-t border-gray-100 text-sm">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <p className="text-gray-500">Rate</p>
                                            <p className="font-medium">₹{job.rate} / {job.type === 'hourly' ? 'hr' : 'unit'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Quantity</p>
                                            <p className="font-medium">{job.quantity} {job.type === 'hourly' ? 'hrs' : 'units'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Paid</p>
                                            <p className="font-medium text-green-600">₹{paidAmount}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Balance</p>
                                            <p className="font-medium text-red-600">₹{balance}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Due Date</p>
                                            <p className={clsx("font-medium", displayStatus === 'overdue' ? 'text-red-600' : '')}>
                                                {format(parseISO(job.dueDate), 'dd MMM yyyy')}
                                            </p>
                                        </div>
                                    </div>

                                    {balance > 0 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openPaymentModal(job); }}
                                            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium shadow active:scale-95 transition-transform flex justify-center items-center gap-2"
                                        >
                                            <Banknote size={18} />
                                            Record Payment (₹{balance})
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Add Job Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold">New Job</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-500"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleJobSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input type="date" required className="w-full p-3 rounded-lg border border-gray-300"
                                    value={jobFormData.date} onChange={e => setJobFormData({ ...jobFormData, date: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                                <select required className="w-full p-3 rounded-lg border border-gray-300 bg-white"
                                    value={jobFormData.clientId} onChange={e => handleClientChange(Number(e.target.value))}
                                >
                                    <option value="0">Select Client</option>
                                    {clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-gray-700">Operation</label>
                                    <a href="/operations" className="text-xs text-green-600 font-bold hover:underline">Manage</a>
                                </div>
                                <select required className="w-full p-3 rounded-lg border border-gray-300 bg-white"
                                    value={jobFormData.operationTypeId} onChange={e => handleOperationChange(Number(e.target.value))}
                                >
                                    <option value="0">Select Operation</option>
                                    {operations?.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹)</label>
                                    <input type="number" required className="w-full p-3 rounded-lg border border-gray-300"
                                        value={jobFormData.rate} onChange={e => setJobFormData({ ...jobFormData, rate: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {jobFormData.type === 'hourly' ? 'Hours' : 'Quantity'}
                                    </label>
                                    <input type="number" step="0.5" required className="w-full p-3 rounded-lg border border-gray-300"
                                        value={jobFormData.quantity} onChange={e => setJobFormData({ ...jobFormData, quantity: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg text-center">
                                <p className="text-sm text-gray-500">Total Amount</p>
                                <p className="text-2xl font-bold text-green-600">₹{jobFormData.amount}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button type="button" className={clsx("flex-1 py-2 rounded-md text-sm font-medium transition-colors", jobFormData.paymentType === 'immediate' ? 'bg-white shadow text-green-700' : 'text-gray-500')}
                                        onClick={() => setJobFormData({ ...jobFormData, paymentType: 'immediate' })}
                                    >Immediate</button>
                                    <button type="button" className={clsx("flex-1 py-2 rounded-md text-sm font-medium transition-colors", jobFormData.paymentType === 'credit' ? 'bg-white shadow text-red-700' : 'text-gray-500')}
                                        onClick={() => setJobFormData({ ...jobFormData, paymentType: 'credit' })}
                                    >Credit (Udhaar)</button>
                                </div>
                            </div>

                            {jobFormData.paymentType === 'credit' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date ({jobFormData.dueDays} days)</label>
                                    <input type="date" required className="w-full p-3 rounded-lg border border-gray-300"
                                        value={jobFormData.dueDate} onChange={e => setJobFormData({ ...jobFormData, dueDate: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="pt-4">
                                <button type="submit" className="w-full py-4 text-white bg-green-600 rounded-xl font-bold shadow-lg active:scale-95 transition-transform">
                                    Save Job
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold">Record Payment</h2>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-500"><X size={24} /></button>
                        </div>
                        <form onSubmit={handlePaymentSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input type="date" required className="w-full p-3 rounded-lg border border-gray-300"
                                    value={paymentFormData.date} onChange={e => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                                <input type="number" required className="w-full p-3 rounded-lg border border-gray-300"
                                    value={paymentFormData.amount} onChange={e => setPaymentFormData({ ...paymentFormData, amount: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                                <select className="w-full p-3 rounded-lg border border-gray-300 bg-white"
                                    value={paymentFormData.method} onChange={e => setPaymentFormData({ ...paymentFormData, method: e.target.value })}
                                >
                                    <option value="cash">Cash</option>
                                    <option value="online">Online / UPI</option>
                                    <option value="bank">Bank Transfer</option>
                                </select>
                            </div>
                            <button type="submit" className="w-full py-3 text-white bg-green-600 rounded-xl font-medium shadow-md mt-4">
                                Save Payment
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Jobs;
