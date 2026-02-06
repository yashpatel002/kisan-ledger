import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type OperationType } from '../db';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Edit2, X } from 'lucide-react';

const Operations: React.FC = () => {
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOp, setEditingOp] = useState<OperationType | null>(null);

    const [formData, setFormData] = useState<OperationType>({
        name: '',
        type: 'hourly',
        defaultRate: 0,
    });

    const operations = useLiveQuery(() => db.operationTypes.toArray());

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingOp?.id) {
            await db.operationTypes.update(editingOp.id, formData);
        } else {
            await db.operationTypes.add(formData);
        }
        handleCloseModal();
    };

    const handleDelete = async (id: number) => {
        if (confirm('Delete this operation type?')) {
            await db.operationTypes.delete(id);
        }
    };

    const handleEdit = (op: OperationType) => {
        setEditingOp(op);
        setFormData(op);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingOp(null);
        setFormData({ name: '', type: 'hourly', defaultRate: 0 });
    };

    return (
        <div className="pb-20">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">{t('operations')}</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md active:scale-95 transition-transform"
                >
                    <Plus size={20} />
                    {t('add_new')}
                </button>
            </header>

            <div className="grid gap-4">
                {operations?.map((op) => (
                    <div key={op.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">{op.name}</h3>
                            <div className="flex items-center text-gray-500 mt-1 gap-3">
                                <span className="text-sm bg-gray-100 px-2 py-1 rounded">{op.type === 'hourly' ? 'Hourly' : 'Fixed'}</span>
                                <span className="text-sm font-semibold">₹{op.defaultRate}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEdit(op)}
                                className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button
                                onClick={() => op.id && handleDelete(op.id)}
                                className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold">{editingOp ? t('edit') : t('add_new')}</h2>
                            <button onClick={handleCloseModal} className="text-gray-500">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button
                                        type="button"
                                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${formData.type === 'hourly' ? 'bg-white shadow text-green-700' : 'text-gray-500'}`}
                                        onClick={() => setFormData({ ...formData, type: 'hourly' })}
                                    >
                                        Hourly
                                    </button>
                                    <button
                                        type="button"
                                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${formData.type === 'fixed' ? 'bg-white shadow text-green-700' : 'text-gray-500'}`}
                                        onClick={() => setFormData({ ...formData, type: 'fixed' })}
                                    >
                                        Fixed
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Default Rate (₹)</label>
                                <input
                                    type="number"
                                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    value={formData.defaultRate}
                                    onChange={(e) => setFormData({ ...formData, defaultRate: parseInt(e.target.value) || 0 })}
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
                                    className="flex-1 py-3 text-white bg-green-600 rounded-xl font-medium shadow-md active:scale-95 transition-transform"
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

export default Operations;
