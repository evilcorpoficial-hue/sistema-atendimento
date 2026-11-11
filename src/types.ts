export interface Ticket {
  id: string;
  number: number;
  formattedNumber: string;
  category: string;
  code: string; // e.g. "01 CAF"
  desk: string; // e.g. "Sala 1"
  status: 'waiting' | 'called' | 'completed' | 'skipped';
  createdAt: string;
  calledAt?: string;
}

export interface TicketCategory {
  id: string;
  name: string;
  code: string; // "CAF", "GERAL", "PRI", "LIC", etc.
  description?: string;
  color?: string;
  defaultDesk?: string; // e.g. "Sala 1", "Guichê 2"
  nextShortcut?: string; // e.g. "ArrowUp", "f", "1"
  prevShortcut?: string; // e.g. "ArrowDown", "b", "2"
  resetShortcut?: string; // e.g. "Delete", "0", "F8" - Tecla para resetar esta fila específica
  speechText?: string; // Como a voz sintética feminina deve falar a fila (ex: "caf" ao invés de "C.A.F")
}

export interface QueueState {
  institution: string;
  currentTicket: Ticket | null;
  history: Ticket[]; // Recently called tickets
  waitingQueue: Ticket[]; // Pending tickets
  activeCategory: string; // "TODAS" or category code
  currentDesk: string; // e.g. "Sala 1"
  counters: Record<string, number>;
  soundAlertToken: number; // Incremented when a ticket is called
  lastCalledAt?: string;
  speechEnabled: boolean;
  chimeEnabled: boolean;
  categories?: TicketCategory[];
  lastResetSlot?: string;
  resetAllShortcut?: string; // Tecla configurada para reset geral de todas as filas
}

export type WebSocketMessage = 
  | { type: 'STATE_UPDATE'; payload: QueueState }
  | { type: 'CALL_NEXT'; desk?: string; category?: string }
  | { type: 'CALL_PREV'; desk?: string; category?: string }
  | { type: 'CALL_DIRECT'; category: string; number: number | string; desk?: string }
  | { type: 'RECALL_CURRENT' }
  | { type: 'ADD_TICKET'; category: string }
  | { type: 'RESET_QUEUE'; category?: string }
  | { type: 'UPDATE_DESK'; desk: string }
  | { type: 'UPDATE_INSTITUTION'; institution: string }
  | { type: 'UPDATE_CATEGORIES'; categories: TicketCategory[] }
  | { type: 'UPDATE_RESET_ALL_SHORTCUT'; shortcut: string }
  | { type: 'CALL_SPECIFIC'; ticketId: string; desk?: string };
