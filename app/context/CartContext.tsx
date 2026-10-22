"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. Cấu trúc món ăn trong giỏ hàng
export interface CartItem {
  _id: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  isPreOrderOnly?: boolean;
  quantity: number;
}

// Cấu trúc thông tin đặt bàn trong luồng workflow
export interface BookingInfo {
  name: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  guests: string | number;
  note?: string;
  tableNumber?: string;
  tableType?: string;
  tableCapacity?: string | number;
  bookingCode?: string;
}

// 2. Kiểu dữ liệu cho Cart Context
interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [bookingInfo, setBookingInfoState] = useState<BookingInfo | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Khôi phục giỏ hàng và thông tin đặt bàn từ localStorage khi load trang lần đầu
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }

      const savedBooking = localStorage.getItem(LOCAL_STORAGE_BOOKING_KEY);
      if (savedBooking) {
        setBookingInfoState(JSON.parse(savedBooking));
      }
    } catch (error) {
      console.error('Lỗi khi đọc dữ liệu từ localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // 2. Tự động lưu giỏ hàng vào localStorage khi có thay đổi (chỉ sau khi đã load xong)
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cart));
      } catch (error) {
        console.error('Lỗi khi lưu giỏ hàng vào localStorage:', error);
      }
    }
  }, [cart, isLoaded]);

  // 3. Tự động lưu thông tin đặt bàn vào localStorage
  useEffect(() => {
    if (isLoaded) {
      try {
        if (bookingInfo) {
          localStorage.setItem(LOCAL_STORAGE_BOOKING_KEY, JSON.stringify(bookingInfo));
        } else {
          localStorage.removeItem(LOCAL_STORAGE_BOOKING_KEY);
        }
      } catch (error) {
        console.error('Lỗi khi lưu thông tin đặt bàn vào localStorage:', error);
      }
    }
  }, [bookingInfo, isLoaded]);

  // Cập nhật thông tin đặt bàn
  const setBookingInfo = (
    info: BookingInfo | null | ((prev: BookingInfo | null) => BookingInfo | null)
  ) => {
    setBookingInfoState(info);
  };

  // Xóa thông tin đặt bàn
  const clearBookingInfo = () => {
    setBookingInfoState(null);
    try {
      localStorage.removeItem(LOCAL_STORAGE_BOOKING_KEY);
    } catch (e) {
      console.error(e);
    }
  };

  // Thêm món vào giỏ
  const addToCart = (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((i) => i._id === item._id);
      if (existingIndex > -1) {
        const newCart = [...prevCart];
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + quantity,
        };
        return newCart;
      }
      return [...prevCart, { ...item, quantity }];
    });
  };

  // Xóa món khỏi giỏ
  const removeFromCart = (itemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item._id !== itemId));
  };

  // Cập nhật số lượng món
  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item._id === itemId ? { ...item, quantity } : item
      )
    );
  };

  // Làm sạch giỏ hàng
  const clearCart = () => {
    setCart([]);
  };

  // Tổng số lượng món trong giỏ
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);

  // Tổng tiền giỏ hàng
  const totalPrice = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  // Helper: Đã hoàn tất chọn thông tin và chọn bàn (Bước 1 & Bước 2)
  const hasActiveBooking = Boolean(
    bookingInfo && bookingInfo.tableNumber && bookingInfo.name && bookingInfo.phone
  );

  // Helper: Kiểm tra giỏ hàng có món đặc biệt (isPreOrderOnly) hay không
  const hasSpecialItems = cart.some((item) => item.isPreOrderOnly === true);

  // Helper: Lấy danh sách các món đặc biệt trong giỏ hàng
  const getSpecialItems = () => cart.filter((item) => item.isPreOrderOnly === true);

  // Helper: Kiểm tra người dùng có đủ điều kiện đặt món đặc biệt hay không (phải có đơn đặt bàn đã chọn bàn)
  const canAddPreOrderItem = () => hasActiveBooking;

  return (
    <CartContext.Provider
      value={{
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
      }}
    >
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
