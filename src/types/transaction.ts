import { User } from './user';

export interface Transaction {
  id: string;
  fromUser: string;
  toUser: string;
  amount: number;
  description: string;
  date: any;
  type: 'income' | 'expense';
  categoryId: string;
  isSalary?: boolean;
  photos?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: Date;
    path: string;
  }>;
}

export interface GroupedTransactions {
  [key: string]: Transaction[];
}