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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'smares_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Khôi phục giỏ hàng từ localStorage khi load trang lần đầu
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error('Lỗi khi đọc giỏ hàng từ localStorage:', error);
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
