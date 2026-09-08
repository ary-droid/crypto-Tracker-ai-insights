import { configureStore } from "@reduxjs/toolkit";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type CryptoCoin = {
  id: string;
  price: number;
  image: string;
  name: string;
  quantity?: number; // user-entered quantity (optional)
};

type FavouritesState = {
  list: CryptoCoin[];
};

const initialState: FavouritesState = { list: [] };

const favouriteSlice = createSlice({
  name: "favourites",
  initialState,
  reducers: {
    addToFavourites(state, action: PayloadAction<any>) {
      const newItem = action.payload;
      const existingItem = state.list.find((item) => item.id === newItem.id);

      if (!existingItem) {
        state.list.push({
          id: newItem.id,
          price: newItem.current_price ?? newItem.price ?? 0,
          image: newItem.image,
          name: newItem.id,
          quantity: newItem.quantity ?? 1,
        });
      }
    },

    removeFromFavourites(state, action: PayloadAction<{ id: string }>) {
      const idToRemove = action.payload.id;
      state.list = state.list.filter((item) => item.id !== idToRemove);
    },

    updateQuantity(state, action: PayloadAction<{ id: string; quantity: number }>) {
      const { id, quantity } = action.payload;
      const existing = state.list.find((i) => i.id === id);
      if (existing) {
        existing.quantity = quantity;
      }
    },

    // optional: update price if needed
    updatePrice(state, action: PayloadAction<{ id: string; price: number }>) {
      const { id, price } = action.payload;
      const existing = state.list.find((i) => i.id === id);
      if (existing) existing.price = price;
    },
  },
});

const store = configureStore({ reducer: { favourites: favouriteSlice.reducer } });

export default store;

export const favouritesActions = favouriteSlice.actions;
