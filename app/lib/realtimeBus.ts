import { EventEmitter } from 'node:events';

export const REALTIME_EVENT_TYPES = {
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_STATUS_UPDATED: 'ORDER_STATUS_UPDATED',
  WAITER_CALL_CREATED: 'WAITER_CALL_CREATED',
  WAITER_CALL_UPDATED: 'WAITER_CALL_UPDATED',
} as const;

export type RealtimeEventType =
  (typeof REALTIME_EVENT_TYPES)[keyof typeof REALTIME_EVENT_TYPES];

export interface RealtimeOrderEvent {
  type:
    | typeof REALTIME_EVENT_TYPES.ORDER_CREATED
    | typeof REALTIME_EVENT_TYPES.ORDER_STATUS_UPDATED;
  orderId: string;
  orderCode?: string;
  tableNumber?: string;
  status: string;
  totalAmount?: number;
  timestamp: string;
}

export interface RealtimeWaiterCallEvent {
  type:
    | typeof REALTIME_EVENT_TYPES.WAITER_CALL_CREATED
    | typeof REALTIME_EVENT_TYPES.WAITER_CALL_UPDATED;
  callId: string;
  tableNumber?: string;
  reason?: string;
  status: string;
  timestamp: string;
}

export type RealtimeEvent = RealtimeOrderEvent | RealtimeWaiterCallEvent;

export type RealtimeEventInput =
  | (Omit<RealtimeOrderEvent, 'timestamp'> & { timestamp?: string })
  | (Omit<RealtimeWaiterCallEvent, 'timestamp'> & { timestamp?: string });

const REALTIME_BUS_CHANNEL = 'smares:realtime-event';
const MAX_REALTIME_LISTENERS = 100;

function getRealtimeBus(): EventEmitter {
  const globalWithBus = globalThis as { __smaresRealtimeBus?: EventEmitter };
  if (!globalWithBus.__smaresRealtimeBus) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(MAX_REALTIME_LISTENERS);
    globalWithBus.__smaresRealtimeBus = emitter;
  }
  return globalWithBus.__smaresRealtimeBus;
}

export function emitRealtimeEvent(event: RealtimeEventInput): RealtimeEvent {
  const bus = getRealtimeBus();
  const payload: RealtimeEvent = {
    ...event,
    timestamp: event.timestamp ?? new Date().toISOString(),
  };
  bus.emit(REALTIME_BUS_CHANNEL, payload);
  return payload;
}

export function subscribeRealtimeEvents(
  listener: (event: RealtimeEvent) => void
): () => void {
  const bus = getRealtimeBus();
  bus.on(REALTIME_BUS_CHANNEL, listener);
  return () => {
    bus.off(REALTIME_BUS_CHANNEL, listener);
  };
}
export interface RealtimeAddonItemSummary {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface RealtimeOrderEvent {
  type:
    | typeof REALTIME_EVENT_TYPES.ORDER_CREATED
    | typeof REALTIME_EVENT_TYPES.ORDER_STATUS_UPDATED;
  orderId: string;
  orderCode?: string;
  tableNumber?: string;
  status: string;
  totalAmount?: number;
  isAddon?: boolean;
  mergedCount?: number;
  addedNewLines?: number;
  addedItems?: RealtimeAddonItemSummary[];
  timestamp: string;
}
