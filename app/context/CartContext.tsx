"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import {
  addItemToCartList,
  migrateCartItems,
  removeItemFromCartList,
  updateItemQuantityInCartList,
  type AddCartItemInput,
  type CartItem,
  type ItemCustomizations,
} from '@/app/lib/cartHelpers';

export type { ItemCustomizations, CartItem };

// Cấu trúc thông tin đặt bàn trong luồng workflow
export interface BookingInfo {
  name: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  guests: string | number;
  note?: string;
  tableId?: string;
  tableNumber?: string;
  tableType?: string;
  tableCapacity?: string | number;
  bookingCode?: string;
}

// Kiểu dữ liệu cho Cart Context
interface CartContextType {
  cart: CartItem[];
  addToCart: (item: AddCartItemInput, quantity?: number) => void;
  removeFromCart: (cartKeyOrId: string) => void;
  updateQuantity: (cartKeyOrId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isLoaded: boolean;

  // Booking Info & Workflow helpers
  bookingInfo: BookingInfo | null;
  setBookingInfo: (info: BookingInfo | null | ((prev: BookingInfo | null) => BookingInfo | null)) => void;
  clearBookingInfo: () => void;
  hasActiveBooking: boolean;

  // Special dishes / Pre-order helpers
  hasSpecialItems: boolean;
  getSpecialItems: () => CartItem[];
  canAddPreOrderItem: () => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'smares_cart';
const LOCAL_STORAGE_BOOKING_KEY = 'smares_booking_draft';
const EMPTY_CART: CartItem[] = [];

const storageListeners = new Set<() => void>();
const memoryFallback = new Map<string, string>();

const emptySubscribe = () => () => {};

function subscribeStorage(listener: () => void): () => void {
  storageListeners.add(listener);
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', listener);
  }
  return () => {
    storageListeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', listener);
    }
  };
}

function readStorageRaw(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryFallback.get(key) ?? null;
  }
}

function writeStorageRaw(key: string, value: string | null): void {
  if (typeof window !== 'undefined') {
    try {
      if (value === null) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, value);
      }
      memoryFallback.delete(key);
    } catch {
      if (value === null) {
        memoryFallback.delete(key);
      } else {
        memoryFallback.set(key, value);
      }
    }
  } else if (value === null) {
    memoryFallback.delete(key);
  } else {
    memoryFallback.set(key, value);
  }

  storageListeners.forEach((listener) => listener());
}

function parseAndMigrateCart(raw: string | null): CartItem[] {
  if (!raw) {
    return EMPTY_CART;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const migrated = migrateCartItems(parsed);
    return migrated.length > 0 ? migrated : EMPTY_CART;
  } catch {
    return EMPTY_CART;
  }
}

function parseBookingInfo(raw: string | null): BookingInfo | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as BookingInfo;
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const isLoaded = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const rawCart = useSyncExternalStore(
    subscribeStorage,
    () => readStorageRaw(LOCAL_STORAGE_KEY),
    () => null
  );

  const rawBooking = useSyncExternalStore(
    subscribeStorage,
    () => readStorageRaw(LOCAL_STORAGE_BOOKING_KEY),
    () => null
  );

  const cart = useMemo(() => parseAndMigrateCart(rawCart), [rawCart]);
  const bookingInfo = useMemo(() => parseBookingInfo(rawBooking), [rawBooking]);

  // Persist migrated cartKey structure back to localStorage when legacy items are loaded
  useEffect(() => {
    if (!isLoaded || rawCart === null) {
      return;
    }
    const serialized = JSON.stringify(cart);
    if (rawCart !== serialized) {
      try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
      } catch {
        // Ignore storage quota errors during background migration
      }
    }
  }, [isLoaded, rawCart, cart]);

  const setBookingInfo = useCallback(
    (info: BookingInfo | null | ((prev: BookingInfo | null) => BookingInfo | null)) => {
      const current = parseBookingInfo(readStorageRaw(LOCAL_STORAGE_BOOKING_KEY));
      const next = typeof info === 'function' ? info(current) : info;
      writeStorageRaw(
        LOCAL_STORAGE_BOOKING_KEY,
        next ? JSON.stringify(next) : null
      );
    },
    []
  );

  const clearBookingInfo = useCallback(() => {
    writeStorageRaw(LOCAL_STORAGE_BOOKING_KEY, null);
  }, []);

  const addToCart = useCallback((item: AddCartItemInput, quantity: number = 1) => {
    const current = parseAndMigrateCart(readStorageRaw(LOCAL_STORAGE_KEY));
    const next = addItemToCartList(current, item, quantity);
    writeStorageRaw(LOCAL_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const removeFromCart = useCallback((cartKeyOrId: string) => {
    const current = parseAndMigrateCart(readStorageRaw(LOCAL_STORAGE_KEY));
    const next = removeItemFromCartList(current, cartKeyOrId);
    writeStorageRaw(LOCAL_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const updateQuantity = useCallback((cartKeyOrId: string, quantity: number) => {
    const current = parseAndMigrateCart(readStorageRaw(LOCAL_STORAGE_KEY));
    const next = updateItemQuantityInCartList(current, cartKeyOrId, quantity);
    writeStorageRaw(LOCAL_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const clearCart = useCallback(() => {
    writeStorageRaw(LOCAL_STORAGE_KEY, JSON.stringify(EMPTY_CART));
  }, []);

  const totalItems = useMemo(
    () => cart.reduce((total, item) => total + item.quantity, 0),
    [cart]
  );

  const totalPrice = useMemo(
    () => cart.reduce((total, item) => total + item.price * item.quantity, 0),
    [cart]
  );

  const hasActiveBooking = Boolean(
    bookingInfo && bookingInfo.tableNumber && bookingInfo.name && bookingInfo.phone
  );

  const hasSpecialItems = useMemo(
    () => cart.some((item) => item.isPreOrderOnly === true),
    [cart]
  );

  const getSpecialItems = useCallback(
    () => cart.filter((item) => item.isPreOrderOnly === true),
    [cart]
  );

  const canAddPreOrderItem = useCallback(() => hasActiveBooking, [hasActiveBooking]);

  const contextValue = useMemo<CartContextType>(
    () => ({
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice,
      isLoaded,
      bookingInfo,
      setBookingInfo,
      clearBookingInfo,
      hasActiveBooking,
      hasSpecialItems,
      getSpecialItems,
      canAddPreOrderItem,
    }),
    [
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice,
      isLoaded,
      bookingInfo,
      setBookingInfo,
      clearBookingInfo,
      hasActiveBooking,
      hasSpecialItems,
      getSpecialItems,
      canAddPreOrderItem,
    ]
  );

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

// Custom Hook để các component dễ dàng sử dụng giỏ hàng
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart phải được sử dụng bên trong CartProvider');
  }
  return context;
}
