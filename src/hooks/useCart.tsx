import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    // Buscar dados do localStorage
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productExists = cart.find((x) => x.id === productId);

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      const stockAmount = stock.amount;
      const currentAmount = productExists ? productExists.amount : 0;

      const amount = currentAmount + 1;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productExists) {
        await updateProductAmount({ productId, amount });
  
        toast.success("Produto adicionado ao carrinho");
      } else {
        const response = await api.get(`/products/${productId}`);
  
        const data = {
          ...response.data,
          amount: 1, //insere quantidade 1
        };
  
        setCart(prevState => {
          const newState = [...prevState, data];

          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newState));

          return newState;
        });
  
        toast.success("Produto adicionado ao carrinho");
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if(!cart.some(x => x.id === productId))
        throw new Error();
      
      setCart(prevState => {
        const newState = prevState.filter(x => x.id !== productId);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newState));
        
        return newState;
      });

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 1)
        throw new Error();

      const { data: stock } = await api.get(`/stock/${productId}`);
      const stockAmount = stock.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      setCart((prevState) => {
        const newState = prevState.map(item => ({
          ...item,
          amount: item.id === productId ? amount : item.amount
        }));

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newState));

        return newState;
      });
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
