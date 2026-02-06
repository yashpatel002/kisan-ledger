import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Client } from '../db';
import { useTranslation } from 'react-i18next';
import { Plus, Phone, Trash2, Edit2, Search, X, FileClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Clients: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState<Client>({
        name: '',
        phone: '',
        defaultDueDays: 30,
    });

    const clients = useLiveQuery(
        () =>
            db.clients
                .filter((client) =>
                    client.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .toArray(),
        [searchTerm]
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingClient?.id) {
            await db.clients.update(editingClient.id, formData);
        } else {
            await db.clients.add(formData);
        }
        handleCloseModal();
    };

    const handleDelete = async (id: number) => {
        if (confirm(t('delete_confirm') || 'Are you sure?')) {
            await db.clients.delete(id);
        }
    };

    const handleEdit = (client: Client) => {
        setEditingClient(client);
        setFormData(client);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingClient(null);
        setFormData({ name: '', phone: '', defaultDueDays: 30 });
    };

    return (
        <div className="pb-20">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">{t('clients')}</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md active:scale-95 transition-transform"
                >
                    <Plus size={20} />
                    {t('add_new')}
                </button>
            </header>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder={t('search')}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid gap-4">
                {clients?.map((client) => (
                    <div key={client.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">{client.name}</h3>
                            <div className="flex items-center text-gray-500 mt-1">
                                <Phone size={14} className="mr-1" />
                                <span className="text-sm">{client.phone}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => navigate(`/clients/${client.id}`)}
                                className="p-2 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100"
                                title="View History"
                            >
                                <FileClock size={18} />
                            </button>
                            <button
                                onClick={() => handleEdit(client)}
                                className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button
                                onClick={() => client.id && handleDelete(client.id)}
                                className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
                {clients?.length === 0 && (
                    <div className="text-center text-gray-400 py-10">
                        No clients found
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold">{editingClient ? t('edit') : t('add_new')}</h2>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Default Credit Days</label>
                                <input
                                    type="number"
                                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    value={formData.defaultDueDays}
                                    onChange={(e) => setFormData({ ...formData, defaultDueDays: parseInt(e.target.value) || 0 })}
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

export default Clients;
