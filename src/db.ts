import Dexie, { type Table } from 'dexie';

export interface Client {
    id?: number;
    name: string;
    phone: string;
    defaultDueDays: number;
}

export interface OperationType {
    id?: number;
    name: string;
    type: 'hourly' | 'fixed';
    defaultRate: number;
}

export interface Job {
    id?: number;
    date: string; // ISO date string
    clientId: number;
    operationTypeId: number;
    type: 'hourly' | 'fixed';
    rate: number;
    quantity: number; // hours or fixed quantity (1)
    amount: number;
    paymentType: 'immediate' | 'credit';
    dueDays: number;
    dueDate: string; // ISO date string
    notes?: string;
    status: 'paid' | 'partial' | 'pending' | 'overdue';
}

export interface Expense {
    id?: number;
    date: string;
    category: string;
    amount: number;
    notes?: string;
}

export interface Payment {
    id?: number;
    jobId: number;
    amount: number;
    date: string;
    method: string;
    notes?: string;
}

export interface Settings {
    id?: number;
    language: 'en' | 'gu';
    currency: string;
}

export class KisanLedgerDB extends Dexie {
    clients!: Table<Client>;
    operationTypes!: Table<OperationType>;
    jobs!: Table<Job>;
    expenses!: Table<Expense>;
    payments!: Table<Payment>;
    settings!: Table<Settings>;

    constructor() {
        super('KisanLedgerDB');
        this.version(1).stores({
            clients: '++id, name, phone',
            operationTypes: '++id, name',
            jobs: '++id, date, clientId, status, dueDate',
            expenses: '++id, date, category',
            payments: '++id, jobId, date',
            settings: '++id'
        });
    }
}

export const db = new KisanLedgerDB();
