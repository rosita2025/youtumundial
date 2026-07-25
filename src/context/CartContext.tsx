import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Cart, CartItem, Product, ProductVariant } from '@/lib/data/types';
import { generateId } from '@/lib/utils/format';
import { toast } from 'sonner';

interface CartState {
  cart: Cart;
  isOpen: boolean;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: { product: Product; variant: ProductVariant; quantity: number } }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { itemId: string } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CART'; payload: Cart }
  | { type: 'TOGGLE_CART' }
  | { type: 'OPEN_CART' }
  | { type: 'CLOSE_CART' };

const CART_STORAGE_KEY = 'ecommerce-cart';

const createEmptyCart = (): Cart => ({
  id: generateId(),
  items: [],
  subtotal: 0,
  itemCount: 0,
});

const calculateTotals = (items: CartItem[]): { subtotal: number; itemCount: number } => {
  return items.reduce(
    (acc, item) => ({
      subtotal: acc.subtotal + item.variant.price * item.quantity,
      itemCount: acc.itemCount + item.quantity,
    }),
    { subtotal: 0, itemCount: 0 }
  );
};

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, variant, quantity } = action.payload;
      const existingIndex = state.cart.items.findIndex(
        item => item.productId === product.id && item.variantId === variant.id
      );

      let newItems: CartItem[];
      if (existingIndex >= 0) {
        newItems = state.cart.items.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        const newItem: CartItem = {
          id: generateId(),
          productId: product.id,
          variantId: variant.id,
          quantity,
          product,
          variant,
        };
        newItems = [...state.cart.items, newItem];
      }

      const totals = calculateTotals(newItems);
      return {
        ...state,
        cart: { ...state.cart, items: newItems, ...totals },
        isOpen: true,
      };
    }

    case 'UPDATE_QUANTITY': {
      const { itemId, quantity } = action.payload;
      if (quantity <= 0) {
        const newItems = state.cart.items.filter(item => item.id !== itemId);
        const totals = calculateTotals(newItems);
        return {
          ...state,
          cart: { ...state.cart, items: newItems, ...totals },
        };
      }

      const newItems = state.cart.items.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      );
      const totals = calculateTotals(newItems);
      return {
        ...state,
        cart: { ...state.cart, items: newItems, ...totals },
      };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.cart.items.filter(item => item.id !== action.payload.itemId);
      const totals = calculateTotals(newItems);
      return {
        ...state,
        cart: { ...state.cart, items: newItems, ...totals },
      };
    }

    case 'CLEAR_CART': {
      return {
        ...state,
        cart: createEmptyCart(),
      };
    }

    case 'SET_CART': {
      return {
        ...state,
        cart: action.payload,
      };
    }

    case 'TOGGLE_CART': {
      return { ...state, isOpen: !state.isOpen };
    }

    case 'OPEN_CART': {
      return { ...state, isOpen: true };
    }

    case 'CLOSE_CART': {
      return { ...state, isOpen: false };
    }

    default:
      return state;
  }
};

interface CartContextValue {
  cart: Cart;
  isOpen: boolean;
  addToCart: (product: Product, variant: ProductVariant, quantity?: number) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    cart: createEmptyCart(),
    isOpen: false,
  });

  // Load cart from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      try {
        const cart = JSON.parse(saved);
        dispatch({ type: 'SET_CART', payload: cart });
      } catch {
        console.error('Failed to parse saved cart');
      }
    }
  }, []);

  // Save cart to localStorage on changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart));
  }, [state.cart]);

  const addToCart = (product: Product, variant: ProductVariant, quantity = 1) => {
    dispatch({ type: 'ADD_ITEM', payload: { product, variant, quantity } });
    toast.success(`${product.title} added to cart`);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } });
  };

  const removeItem = (itemId: string) => {
    const item = state.cart.items.find(i => i.id === itemId);
    dispatch({ type: 'REMOVE_ITEM', payload: { itemId } });
    if (item) {
      toast.success(`${item.product.title} removed from cart`);
    }
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const toggleCart = () => dispatch({ type: 'TOGGLE_CART' });
  const openCart = () => dispatch({ type: 'OPEN_CART' });
  const closeCart = () => dispatch({ type: 'CLOSE_CART' });

  return (
    <CartContext.Provider
      value={{
        cart: state.cart,
        isOpen: state.isOpen,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        toggleCart,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
