import React from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { db } from '../db';
import { Download, Upload, Globe, Trash2, Database } from 'lucide-react';
import { saveAs } from 'file-saver';

const Settings: React.FC = () => {
    const { t, i18n } = useTranslation();
    const buildDate = __BUILD_DATE__;

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('i18nextLng', lng);
    };

    const exportData = async () => {
        try {
            const clients = await db.clients.toArray();
            const operations = await db.operationTypes.toArray();
            const jobs = await db.jobs.toArray();
            const expenses = await db.expenses.toArray();
            const payments = await db.payments.toArray();

            const data = {
                clients,
                operations,
                jobs,
                expenses,
                payments,
                exportDate: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            saveAs(blob, `KisanLedger_Backup_${new Date().toISOString().split('T')[0]}.json`);
            alert('Backup downloaded successfully!');
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed');
        }
    };

    const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm('This will overwrite all current data. Are you sure?')) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);

                await db.transaction('rw', [db.clients, db.operationTypes, db.jobs, db.expenses, db.payments], async () => {
                    await db.clients.clear();
                    await db.operationTypes.clear();
                    await db.jobs.clear();
                    await db.expenses.clear();
                    await db.payments.clear();

                    if (json.clients) await db.clients.bulkAdd(json.clients);
                    if (json.operations) await db.operationTypes.bulkAdd(json.operations);
                    if (json.jobs) await db.jobs.bulkAdd(json.jobs);
                    if (json.expenses) await db.expenses.bulkAdd(json.expenses);
                    if (json.payments) await db.payments.bulkAdd(json.payments);
                });

                alert('Data restored successfully!');
                window.location.reload();
            } catch (error) {
                console.error('Import failed:', error);
                alert('Import failed. Invalid file format.');
            }
        };
        reader.readAsText(file);
    };

    const clearData = async () => {
        if (confirm('DANGER: This will delete ALL data permanently. Are you sure?')) {
            if (confirm('Double check: Are you REALLY sure?')) {
                await db.delete();
                window.location.reload();
            }
        }
    };

    return (
        <div className="pb-20 space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">{t('settings')}</h1>

            {/* Language Section */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-700 flex items-center gap-2 mb-4">
                    <Globe size={20} />
                    Language (ભાષા)
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => changeLanguage('en')}
                        className={`p-4 rounded-xl border-2 font-medium transition-all ${i18n.language === 'en'
                            ? 'border-green-600 bg-green-50 text-green-700'
                            : 'border-gray-200 text-gray-600'
                            }`}
                    >
                        English
                    </button>
                    <button
                        onClick={() => changeLanguage('gu')}
                        className={`p-4 rounded-xl border-2 font-medium transition-all ${i18n.language === 'gu'
                            ? 'border-green-600 bg-green-50 text-green-700'
                            : 'border-gray-200 text-gray-600'
                            }`}
                    >
                        ગુજરાતી
                    </button>
                </div>
            </div>

            {/* Backup Section */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-700 flex items-center gap-2 mb-4">
                    <Database size={20} />
                    Backup & Restore
                </h2>
                <div className="space-y-4">
                    <button
                        onClick={exportData}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg font-medium active:scale-95 transition-transform"
                    >
                        <Download size={20} />
                        Download Backup (JSON)
                    </button>

                    <div className="relative">
                        <input
                            type="file"
                            accept=".json"
                            onChange={importData}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <button
                            className="w-full flex items-center justify-center gap-2 p-3 bg-gray-50 text-gray-700 rounded-lg font-medium border border-gray-200"
                        >
                            <Upload size={20} />
                            Restore Backup
                        </button>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 p-4 rounded-xl shadow-sm border border-red-100 mt-8">
                <h2 className="font-semibold text-red-700 flex items-center gap-2 mb-4">
                    Danger Zone
                </h2>
                <button
                    onClick={clearData}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-white text-red-600 border border-red-200 rounded-lg font-medium active:scale-95 transition-transform"
                >
                    <Trash2 size={20} />
                    Reset All Data
                </button>
            </div>

            <div className="text-center text-gray-400 text-xs mt-8 space-y-1">
                <div>App Version 1.0.0</div>
                <div>Last Updated: {format(parseISO(buildDate), 'dd MMM yyyy, hh:mm a')}</div>
            </div>
        </div>
    );
};

export default Settings;
