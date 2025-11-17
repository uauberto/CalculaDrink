export interface StockEntry {
  id: string;
  date: string; // ISO string for date
  quantity: number; // Original quantity purchased in this batch
  price: number; // Total price paid for this batch
  remainingQuantity: number; // Quantity left in this batch
}

export interface Ingredient {
  id:string;
  name: string;
  unit: 'ml' | 'l' | 'g' | 'kg' | 'un';
  isAlcoholic: boolean;
  stockEntries: StockEntry[];
  lowStockThreshold?: number; // Optional threshold in the ingredient's unit
}

export interface DrinkIngredient {
  ingredientId: string;
  quantity: number; // in the 'unit' of the ingredient
}

export interface Drink {
  id: string;
  name: string;
  ingredients: DrinkIngredient[];
  consumptionEstimate: { // drinks per person per hour
    adults: number;
    children: number;
  };
}

export interface StaffMember {
  id: string;
  role: string;
  cost: number;
}

export interface Event {
  id: string;
  name: string;
  startTime: string; // ISO string for start date and time
  endTime: string; // ISO string for end date and time
  status: 'planned' | 'completed';
  numAdults: number;
  numChildren: number;
  selectedDrinks: string[]; // Array of drink IDs
  simulatedCosts?: {
    ingredientCost: number;
    operationalCost: number;
    totalCost: number;
    profit: number;
    finalPrice: number;
  };
}