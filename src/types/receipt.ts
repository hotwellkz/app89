export interface ReceiptData {
  operationalExpense: number;
  sipWalls: number;
  ceilingInsulation: number;
  generalExpense: number;
  contractPrice: number;
  totalExpense: number;
  netProfit: number;
}

export interface ReceiptCalculationProps {
  isEditing: boolean;
  clientId: string;
}