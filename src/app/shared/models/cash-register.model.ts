import { Timestamp } from 'firebase/firestore';

export interface productItem {
  idProduto: string;
  quantity: number;
  ammount: number;
}

export interface CashRegister {
  id?: string;
  createdAt: Timestamp;
  sequenceNumber: number;
  idUser: string;
  ammount: number;
  itens: productItem[];
}
