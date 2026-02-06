import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Expense } from '../db';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Edit2, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const Expenses: React.FC = () => {
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    const [formData, setFormData] = useState<Expense>({
        date: new Date().toISOString().split('T')[0],
        category: '',
        amount: 0,
        notes: '',
    });

    const expenses = useLiveQuery(() => db.expenses.reverse().toArray());

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingExpense?.id) {
            await db.expenses.update(editingExpense.id, formData);
        } else {
            await db.expenses.add(formData);
        }
        handleCloseModal();
    };

    const handleDelete = async (id: number) => {
        if (confirm('Delete this expense?')) {
            await db.expenses.delete(id);
        }
    };

    const handleEdit = (expense: Expense) => {
        setEditingExpense(expense);
        setFormData(expense);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingExpense(null);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            category: '',
            amount: 0,
            notes: '',
        });
    };

    const totalExpense = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

    return (
        <div className="pb-20">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{t('expenses')}</h1>
                    <p className="text-gray-500 text-sm">Total: <span className="text-red-600 font-bold">₹{totalExpense}</span></p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md active:scale-95 transition-transform"
                >
                    <Plus size={20} />
                    {t('add_new')}
                </button>
            </header>

            <div className="grid gap-4">
                {expenses?.map((expense) => (
                    <div key={expense.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-gray-800">{expense.category}</span>
                                <span className="text-xs text-gray-400 flex items-center">
                                    <Calendar size={10} className="mr-1" />
                                    {format(new Date(expense.date), 'dd MMM yyyy')}
                                </span>
                            </div>
                            {expense.notes && <p className="text-sm text-gray-500">{expense.notes}</p>}
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-bold text-red-600 text-lg">₹{expense.amount}</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleEdit(expense)}
                                    className="p-1.5 text-blue-600 bg-blue-50 rounded-lg"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => expense.id && handleDelete(expense.id)}
                                    className="p-1.5 text-red-600 bg-red-50 rounded-lg"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-red-600">{editingExpense ? t('edit') : t('add_new')}</h2>
                            <button onClick={handleCloseModal} className="text-gray-500">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    required
                                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="">Select Category</option>
                                    <option value="Fuel">Fuel (Diesel/Petrol)</option>
                                    <option value="Maintenance">Maintenance & Repairs</option>
                                    <option value="Driver">Driver Salary</option>
                                    <option value="Food">Food / Tea</option>
                                    <option value="Parts">Spare Parts</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                                <textarea
                                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    rows={2}
                                    value={formData.notes || ''}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 py-3 text-gray-700 bg-gray-100 rounded-xl font-medium"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 text-white bg-red-500 rounded-xl font-medium shadow-md active:scale-95 transition-transform"
                                >
                                    {t('save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Expenses;
