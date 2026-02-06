import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ArrowLeft, Phone, Calendar, Banknote, Briefcase } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';

const ClientDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const clientId = Number(id);

    const client = useLiveQuery(() => db.clients.get(clientId), [clientId]);

    const jobs = useLiveQuery(() =>
        db.jobs.where('clientId').equals(clientId).reverse().sortBy('date'),
        [clientId]
    );

    const payments = useLiveQuery(() =>
        db.payments.toArray(), // We need to filter manually or add an index later for cleaner code, but filtering is fine for now
        []
    );

    const operationTypes = useLiveQuery(() => db.operationTypes.toArray());

    if (!client) return <div className="p-4 text-center">Loading...</div>;



    // Actually, querying all payments and filtering is inefficient. 
    // Better: Get jobs first, then find payments for those jobs.
    // The previous useLiveQuery for payments fetches ALL payments.
    // Optimization:
    const associatedPayments = payments?.filter(p => jobs?.some(j => j.id === p.jobId)) || [];

    const totalBilled = jobs?.reduce((sum, job) => sum + job.amount, 0) || 0;
    const totalPaid = associatedPayments.reduce((sum, p) => sum + p.amount, 0) || 0;
    const balance = totalBilled - totalPaid;

    const getOpName = (opId: number) => operationTypes?.find(o => o.id === opId)?.name || 'Regular';

    type HistoryItem = {
        type: 'job' | 'payment';
        date: string;
        amount: number;
        details: string; // Job Operation or Payment Method
        id: number;
        originalRef: any;
    };

    const history: HistoryItem[] = [
        ...(jobs?.map(j => ({
            type: 'job' as const,
            date: j.date,
            amount: j.amount,
            details: getOpName(j.operationTypeId),
            id: j.id!,
            originalRef: j
        })) || []),
        ...(associatedPayments?.map(p => ({
            type: 'payment' as const,
            date: p.date,
            amount: p.amount,
            details: p.method,
            id: p.id!,
            originalRef: p
        })) || [])
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="pb-20 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold flex-1 truncate">{client.name}</h1>
                </div>

                <div className="flex items-center text-gray-500 mb-4">
                    <Phone size={16} className="mr-2" />
                    <span>{client.phone || 'No Phone'}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-blue-50 p-2 rounded-lg">
                        <div className="text-xs text-blue-600 font-medium">Billed</div>
                        <div className="text-lg font-bold text-blue-700">₹{totalBilled}</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded-lg">
                        <div className="text-xs text-green-600 font-medium">Received</div>
                        <div className="text-lg font-bold text-green-700">₹{totalPaid}</div>
                    </div>
                    <div className={clsx("p-2 rounded-lg", balance > 0 ? "bg-red-50" : "bg-gray-100")}>
                        <div className={clsx("text-xs font-medium", balance > 0 ? "text-red-600" : "text-gray-600")}>Balance</div>
                        <div className={clsx("text-lg font-bold", balance > 0 ? "text-red-700" : "text-gray-700")}>₹{balance}</div>
                    </div>
                </div>
            </div>

            {/* History List */}
            <div className="p-4 space-y-3">
                <h2 className="font-bold text-gray-700">Transaction History</h2>

                {history.length === 0 && (
                    <div className="text-center text-gray-400 py-10">
                        No history found. Add jobs to see them here.
                    </div>
                )}

                {history.map((item, idx) => (
                    <div key={`${item.type}-${item.id}-${idx}`} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={clsx("p-2 rounded-lg", item.type === 'job' ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600")}>
                                {item.type === 'job' ? <Briefcase size={20} /> : <Banknote size={20} />}
                            </div>
                            <div>
                                <div className="font-bold text-gray-800">
                                    {item.type === 'job' ? item.details : `Payment (${item.details})`}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center mt-1">
                                    <Calendar size={12} className="mr-1" />
                                    {format(parseISO(item.date), 'dd MMM yyyy')}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={clsx("font-bold text-lg", item.type === 'job' ? "text-red-600" : "text-green-600")}>
                                {item.type === 'job' ? '-' : '+'}₹{item.amount}
                            </div>
                            {item.type === 'job' && (
                                <div className="text-xs text-gray-400">Debit</div>
                            )}
                            {item.type === 'payment' && (
                                <div className="text-xs text-gray-400">Credit</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ClientDetails;
