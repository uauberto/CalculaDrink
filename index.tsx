
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  AlertTriangle, BarChart2, Calculator, Calendar, CheckSquare, Clock, DollarSign, Droplets, Edit, History, Martini, MinusCircle, Package, PackagePlus, Plus, Save, Target, Trash2, TrendingUp, Users, X 
} from 'lucide-react';

// --- From types.ts ---
interface StockEntry {
  id: string;
  date: string; // ISO string for date
  quantity: number; // Original quantity purchased in this batch
  price: number; // Total price paid for this batch
  remainingQuantity: number; // Quantity left in this batch
}

interface Ingredient {
  id:string;
  name: string;
  unit: 'ml' | 'l' | 'g' | 'kg' | 'un';
  isAlcoholic: boolean;
  stockEntries: StockEntry[];
  lowStockThreshold?: number; // Optional threshold in the ingredient's unit
}

interface DrinkIngredient {
  ingredientId: string;
  quantity: number; // in the 'unit' of the ingredient
}

interface Drink {
  id: string;
  name: string;
  ingredients: DrinkIngredient[];
  consumptionEstimate: { // drinks per person per hour
    adults: number;
    children: number;
  };
}

interface StaffMember {
  id: string;
  role: string;
  cost: number;
}

interface Event {
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

// --- From hooks/useLocalStorage.ts ---
function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      const valueToStore =
        typeof storedValue === 'function'
          ? storedValue(storedValue)
          : storedValue;
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

// --- From components/IngredientManager.tsx ---
interface IngredientManagerProps {
  ingredients: Ingredient[];
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
}

const IngredientManager: React.FC<IngredientManagerProps> = ({ ingredients, setIngredients }) => {
  const [newIngredient, setNewIngredient] = useState<Omit<Ingredient, 'id' | 'stockEntries'>>({
    name: '',
    unit: 'ml',
    isAlcoholic: false,
    lowStockThreshold: 0,
  });
  const [isEditing, setIsEditing] = useState<string | null>(null);

  const handleAddIngredient = () => {
    if (newIngredient.name) {
       if (isEditing) {
        setIngredients(ingredients.map(ing => ing.id === isEditing ? { ...ing, ...newIngredient } : ing));
        setIsEditing(null);
      } else {
        setIngredients([...ingredients, { ...newIngredient, id: crypto.randomUUID(), stockEntries: [] }]);
      }
      setNewIngredient({ name: '', unit: 'ml', isAlcoholic: false, lowStockThreshold: 0 });
    }
  };

  const handleEdit = (ingredient: Ingredient) => {
    setIsEditing(ingredient.id);
    setNewIngredient({
        name: ingredient.name,
        unit: ingredient.unit,
        isAlcoholic: ingredient.isAlcoholic,
        lowStockThreshold: ingredient.lowStockThreshold || 0,
    });
  };

  const handleDelete = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };
  
  const handleCancelEdit = () => {
    setIsEditing(null);
    setNewIngredient({ name: '', unit: 'ml', isAlcoholic: false, lowStockThreshold: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-orange-400">{isEditing ? 'Editar Insumo' : 'Adicionar Novo Insumo'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <input
            type="text"
            placeholder="Nome do Insumo"
            value={newIngredient.name}
            onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <select
            value={newIngredient.unit}
            onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value as Ingredient['unit'] })}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="ml">ml</option>
            <option value="l">l</option>
            <option value="g">g</option>
            <option value="kg">kg</option>
            <option value="un">un</option>
          </select>
          <input
            type="number"
            placeholder="Alerta de Estoque Baixo"
            value={newIngredient.lowStockThreshold || ''}
            onChange={(e) => setNewIngredient({ ...newIngredient, lowStockThreshold: parseFloat(e.target.value) })}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
           <div className="flex items-center justify-start h-full">
            <label className="flex items-center gap-2 cursor-pointer text-gray-300">
              <input
                type="checkbox"
                checked={newIngredient.isAlcoholic}
                onChange={(e) => setNewIngredient({ ...newIngredient, isAlcoholic: e.target.checked })}
                className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-orange-600 focus:ring-orange-500"
              />
              É Alcoólico?
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
            {isEditing && (
                <button onClick={handleCancelEdit} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors">
                    Cancelar
                </button>
            )}
            <button onClick={handleAddIngredient} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-500 transition-colors">
                <Plus size={18} />
                {isEditing ? 'Salvar Alterações' : 'Adicionar Insumo'}
            </button>
        </div>
      </div>

      <div className="p-6 bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-orange-400">Lista de Insumos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left hidden md:table">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="p-3">Nome</th>
                <th className="p-3">Unidade</th>
                <th className="p-3">Alcoólico</th>
                <th className="p-3">Alerta de Estoque Baixo</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.length > 0 ? ingredients.map(ing => {
                return (
                  <tr key={ing.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="p-3 font-medium">{ing.name}</td>
                    <td className="p-3 text-gray-300">{ing.unit}</td>
                    <td className="p-3 text-gray-300">{ing.isAlcoholic ? 'Sim' : 'Não'}</td>
                    <td className="p-3 text-gray-300">{ing.lowStockThreshold ? `${ing.lowStockThreshold} ${ing.unit}` : 'N/A'}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(ing)} className="p-2 text-blue-400 hover:text-blue-300" title="Editar Insumo"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(ing.id)} className="p-2 text-red-400 hover:text-red-300" title="Excluir Insumo"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-gray-500">Nenhum insumo cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
          {/* Mobile view */}
           <div className="md:hidden space-y-3">
              {ingredients.length > 0 ? ingredients.map(ing => {
                return (
                  <div key={ing.id} className="bg-gray-700/50 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-white">{ing.name}</p>
                        <p className="text-sm text-gray-300 mt-1">
                          Unidade: {ing.unit}
                        </p>
                        <p className="text-sm text-gray-300">
                          Alcoólico: {ing.isAlcoholic ? 'Sim' : 'Não'}
                        </p>
                        <p className="text-sm text-gray-300">
                          Alerta: {ing.lowStockThreshold ? `${ing.lowStockThreshold} ${ing.unit}` : 'N/A'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(ing)} className="p-2 text-blue-400 hover:text-blue-300" title="Editar Insumo"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(ing.id)} className="p-2 text-red-400 hover:text-red-300" title="Excluir Insumo"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  </div>
                )
              }) : (
                 <p className="p-3 text-center text-gray-500">Nenhum insumo cadastrado.</p>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};


// --- From components/StockManager.tsx ---
interface StockManagerProps {
  ingredients: Ingredient[];
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
}

const StockManager: React.FC<StockManagerProps> = ({ ingredients, setIngredients }) => {
  const [addStockModal, setAddStockModal] = useState<Ingredient | null>(null);
  const [historyModal, setHistoryModal] = useState<Ingredient | null>(null);
  const [adjustStockModal, setAdjustStockModal] = useState<Ingredient | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [newEntry, setNewEntry] = useState({ date: new Date().toISOString().split('T')[0], quantity: 0, price: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleAddStockEntry = () => {
    if (!addStockModal || newEntry.quantity <= 0 || newEntry.price <= 0) return;

    const newStockEntry: StockEntry = {
      id: crypto.randomUUID(),
      date: newEntry.date,
      quantity: newEntry.quantity,
      price: newEntry.price,
      remainingQuantity: newEntry.quantity,
    };

    setIngredients(ingredients.map(ing =>
        ing.id === addStockModal.id
          ? { ...ing, stockEntries: [...ing.stockEntries, newStockEntry] }
          : ing
    ));

    setAddStockModal(null);
    setNewEntry({ date: new Date().toISOString().split('T')[0], quantity: 0, price: 0 });
  };
  
  const handleAdjustStock = () => {
    if (!adjustStockModal || adjustmentAmount <= 0) return;

    const totalStock = calculateStockInfo(adjustStockModal).totalStock;
    if (adjustmentAmount > totalStock) {
        alert("A quantidade a ser removida é maior que o estoque atual.");
        return;
    }

    setIngredients(prevIngredients => {
        const newIngredients = JSON.parse(JSON.stringify(prevIngredients));
        const ing = newIngredients.find((i: Ingredient) => i.id === adjustStockModal.id);

        if (ing) {
            let quantityToRemove = adjustmentAmount;
            
            // Sort entries by date to ensure FIFO
            ing.stockEntries.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            for (const entry of ing.stockEntries) {
                if (quantityToRemove <= 0) break;

                const amountToDeduct = Math.min(quantityToRemove, entry.remainingQuantity);
                entry.remainingQuantity -= amountToDeduct;
                quantityToRemove -= amountToDeduct;
            }
        }
        return newIngredients;
    });

    setAdjustStockModal(null);
    setAdjustmentAmount(0);
  };


  const calculateStockInfo = (ingredient: Ingredient) => {
    const totalStock = ingredient.stockEntries.reduce((sum, entry) => sum + entry.remainingQuantity, 0);
    const totalValue = ingredient.stockEntries.reduce((sum, entry) => {
      const costPerUnit = entry.quantity > 0 ? entry.price / entry.quantity : 0;
      return sum + costPerUnit * entry.remainingQuantity;
    }, 0);
    const avgCost = totalStock > 0 ? totalValue / totalStock : 0;
    return { totalStock, avgCost, totalValue };
  };

  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Add Stock Modal */}
      {addStockModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-xl font-bold text-orange-400">Adicionar Entrada: {addStockModal.name}</h3>
              <button onClick={() => setAddStockModal(null)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <input type="date" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2" />
              <input type="number" placeholder={`Quantidade em ${addStockModal.unit}`} value={newEntry.quantity || ''} onChange={e => setNewEntry({...newEntry, quantity: parseFloat(e.target.value)})} className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2" />
              <input type="number" placeholder="Preço Total (R$)" value={newEntry.price || ''} onChange={e => setNewEntry({...newEntry, price: parseFloat(e.target.value)})} className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2" />
              <button onClick={handleAddStockEntry} className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-500">Adicionar</button>
            </div>
          </div>
        </div>
      )}
      
      {/* History Modal */}
      {historyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-xl font-bold text-orange-400">Histórico de Entradas: {historyModal.name}</h3>
              <button onClick={() => setHistoryModal(null)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="p-2">Data</th><th className="p-2">Qtd. Comprada</th><th className="p-2">Preço Pago</th><th className="p-2">Qtd. Restante</th>
                  </tr>
                </thead>
                <tbody>
                  {historyModal.stockEntries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
                    <tr key={entry.id} className="border-b border-gray-700 text-sm">
                      <td className="p-2">{new Date(entry.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                      <td className="p-2">{entry.quantity} {historyModal.unit}</td>
                      <td className="p-2">{formatCurrency(entry.price)}</td>
                      <td className="p-2 font-semibold">{entry.remainingQuantity} {historyModal.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustStockModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-xl font-bold text-orange-400">Ajustar Estoque: {adjustStockModal.name}</h3>
              <button onClick={() => setAdjustStockModal(null)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-300">Estoque atual: {calculateStockInfo(adjustStockModal).totalStock.toFixed(2)} {adjustStockModal.unit}</p>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Quantidade a remover (FIFO)</label>
                <input type="number" placeholder={`Quantidade em ${adjustStockModal.unit}`} value={adjustmentAmount || ''} onChange={e => setAdjustmentAmount(parseFloat(e.target.value))} className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2" />
              </div>
              <button onClick={handleAdjustStock} className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-500">Confirmar Ajuste</button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 bg-gray-800 rounded-lg shadow-md">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
            <h2 className="text-2xl font-bold text-orange-400">Controle de Estoque</h2>
            <input type="text" placeholder="Buscar insumo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-64 bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left hidden md:table">
            <thead><tr className="border-b border-gray-700"><th className="p-3">Nome</th><th className="p-3">Estoque Atual</th><th className="p-3">Custo Médio</th><th className="p-3">Valor em Estoque</th><th className="p-3">Ações</th></tr></thead>
            <tbody>
              {filteredIngredients.map(ing => {
                const { totalStock, avgCost, totalValue } = calculateStockInfo(ing);
                const isLowStock = ing.lowStockThreshold && totalStock < ing.lowStockThreshold;
                return (
                  <tr key={ing.id} className={`border-b border-gray-700 ${isLowStock ? 'bg-red-900/30' : 'hover:bg-gray-700/50'}`}>
                    <td className="p-3 font-medium flex items-center gap-2">{ing.name} {isLowStock && <AlertTriangle className="text-red-400" size={16} title="Estoque baixo!" />}</td>
                    <td className="p-3 font-medium">{totalStock.toFixed(2)} {ing.unit}</td>
                    <td className="p-3">{formatCurrency(avgCost)} / {ing.unit}</td>
                    <td className="p-3 font-semibold">{formatCurrency(totalValue)}</td>
                    <td className="p-3"><div className="flex gap-2"><button onClick={() => setAddStockModal(ing)} className="p-2 text-green-400 hover:text-green-300" title="Adicionar Estoque"><PackagePlus size={18} /></button><button onClick={() => setHistoryModal(ing)} className="p-2 text-blue-400 hover:text-blue-300" title="Ver Histórico"><History size={18} /></button><button onClick={() => setAdjustStockModal(ing)} className="p-2 text-yellow-400 hover:text-yellow-300" title="Ajustar Estoque"><MinusCircle size={18} /></button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="md:hidden space-y-3">
            {filteredIngredients.map(ing => {
              const { totalStock, avgCost, totalValue } = calculateStockInfo(ing);
              const isLowStock = ing.lowStockThreshold && totalStock < ing.lowStockThreshold;
              return (
                <div key={ing.id} className={`p-4 rounded-lg ${isLowStock ? 'bg-red-900/50' : 'bg-gray-700/50'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-white flex items-center gap-2">{ing.name} {isLowStock && <AlertTriangle className="text-red-400" size={16} />}</p>
                      <p className="text-sm text-gray-300 mt-1">Estoque: <span className="font-semibold">{totalStock.toFixed(2)} {ing.unit}</span></p>
                      <p className="text-sm text-gray-300">Valor Total: <span className="font-semibold">{formatCurrency(totalValue)}</span></p>
                      <p className="text-xs text-gray-400">Custo Médio: {formatCurrency(avgCost)} / {ing.unit}</p>
                    </div>
                    <div className="flex gap-1"><button onClick={() => setAddStockModal(ing)} className="p-2 text-green-400" title="Adicionar Estoque"><PackagePlus size={20} /></button><button onClick={() => setHistoryModal(ing)} className="p-2 text-blue-400" title="Ver Histórico"><History size={20} /></button><button onClick={() => setAdjustStockModal(ing)} className="p-2 text-yellow-400" title="Ajustar Estoque"><MinusCircle size={20} /></button></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};


// --- From components/DrinkManager.tsx ---
interface DrinkManagerProps {
  drinks: Drink[];
  setDrinks: React.Dispatch<React.SetStateAction<Drink[]>>;
  ingredients: Ingredient[];
}

const DrinkManager: React.FC<DrinkManagerProps> = ({ drinks, setDrinks, ingredients }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null);

  const [drinkName, setDrinkName] = useState('');
  const [recipe, setRecipe] = useState<DrinkIngredient[]>([]);
  const [consumptionEstimate, setConsumptionEstimate] = useState({ adults: 0.5, children: 0 });

  const openModalForNew = () => {
    setEditingDrink(null);
    setDrinkName('');
    setRecipe([]);
    setConsumptionEstimate({ adults: 0.5, children: 0 });
    setIsModalOpen(true);
  };

  const openModalForEdit = (drink: Drink) => {
    setEditingDrink(drink);
    setDrinkName(drink.name);
    setRecipe(JSON.parse(JSON.stringify(drink.ingredients))); // Deep copy
    setConsumptionEstimate(drink.consumptionEstimate);
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDrink(null);
    setDrinkName('');
    setRecipe([]);
    setConsumptionEstimate({ adults: 0.5, children: 0 });
  };

  const handleAddIngredientToRecipe = () => {
    if (ingredients.length > 0) {
      setRecipe([...recipe, { ingredientId: ingredients[0].id, quantity: 0 }]);
    }
  };

  const handleRecipeChange = (index: number, field: 'ingredientId' | 'quantity', value: string) => {
    const newRecipe = [...recipe];
    if (field === 'quantity') {
      newRecipe[index][field] = parseFloat(value) || 0;
    } else {
      newRecipe[index][field] = value;
    }
    setRecipe(newRecipe);
  };

  const handleRemoveIngredientFromRecipe = (index: number) => {
    setRecipe(recipe.filter((_, i) => i !== index));
  };

  const currentRecipeIsAlcoholic = useMemo(() => {
    return recipe.some(di => {
      const ing = ingredients.find(i => i.id === di.ingredientId);
      return ing?.isAlcoholic;
    });
  }, [recipe, ingredients]);

  const handleSaveDrink = () => {
    if (!drinkName || recipe.length === 0) return;
    
    const finalConsumptionEstimate = {
      adults: consumptionEstimate.adults,
      children: currentRecipeIsAlcoholic ? 0 : consumptionEstimate.children,
    };

    const newDrink: Drink = {
        id: editingDrink ? editingDrink.id : crypto.randomUUID(),
        name: drinkName,
        ingredients: recipe.filter(r => r.quantity > 0 && r.ingredientId),
        consumptionEstimate: finalConsumptionEstimate,
    };

    if (editingDrink) {
        setDrinks(drinks.map(d => d.id === editingDrink.id ? newDrink : d));
    } else {
        setDrinks([...drinks, newDrink]);
    }
    closeModal();
  };
  
  const handleDeleteDrink = (id: string) => {
    setDrinks(drinks.filter(d => d.id !== id));
  };

  const getIngredientInfo = (id: string) => {
    return ingredients.find(i => i.id === id);
  };

  const isDrinkAlcoholic = (drink: Drink) => {
    return drink.ingredients.some(di => {
      const ing = ingredients.find(i => i.id === di.ingredientId);
      return ing?.isAlcoholic;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={openModalForNew}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-500 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <Plus size={18} />
          Adicionar Novo Drink
        </button>
      </div>

      <div className="p-6 bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-orange-400">Lista de Drinks</h2>
        <div className="space-y-4">
          {drinks.length > 0 ? drinks.map(drink => (
            <div key={drink.id} className="bg-gray-700/50 p-4 rounded-lg flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white">{drink.name}</h3>
                  {isDrinkAlcoholic(drink) && <span className="text-xs font-bold bg-red-800 text-white px-2 py-0.5 rounded-full">Alcoólico</span>}
                </div>
                 <div className="flex items-center gap-2 text-xs text-amber-300 mt-2">
                    <TrendingUp size={14}/>
                    <span>Adultos: <strong>{drink.consumptionEstimate.adults}</strong></span>
                    <span>Crianças: <strong>{drink.consumptionEstimate.children}</strong> (d/p/h)</span>
                </div>
                <ul className="list-disc list-inside mt-2 text-sm text-gray-300">
                  {drink.ingredients.map((ing, index) => {
                    const ingredientInfo = getIngredientInfo(ing.ingredientId);
                    return (
                      <li key={index}>
                        {ing.quantity} {ingredientInfo?.unit} de {ingredientInfo?.name || 'Insumo desconhecido'}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="flex gap-2 flex-shrink-0 ml-4">
                <button onClick={() => openModalForEdit(drink)} className="p-2 text-blue-400 hover:text-blue-300"><Edit size={18} /></button>
                <button onClick={() => handleDeleteDrink(drink.id)} className="p-2 text-red-400 hover:text-red-300"><Trash2 size={18} /></button>
              </div>
            </div>
          )) : (
             <p className="text-center text-gray-500">Nenhum drink cadastrado. Clique em "Adicionar Novo Drink" para começar.</p>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-xl font-bold text-orange-400">{editingDrink ? 'Editar Drink' : 'Adicionar Novo Drink'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label htmlFor="drinkName" className="block text-sm font-medium text-gray-300 mb-1">Nome do Drink</label>
                <input
                  id="drinkName"
                  type="text"
                  placeholder="e.g., Negroni"
                  value={drinkName}
                  onChange={e => setDrinkName(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="consumptionEstimateAdults" className="block text-sm font-medium text-gray-300 mb-1">Consumo Adultos (d/p/h)</label>
                  <input
                    id="consumptionEstimateAdults"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g., 0.5"
                    value={consumptionEstimate.adults}
                    onChange={e => setConsumptionEstimate(prev => ({ ...prev, adults: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                 <div>
                  <label htmlFor="consumptionEstimateChildren" className="block text-sm font-medium text-gray-300 mb-1">Consumo Crianças (d/p/h)</label>
                  <input
                    id="consumptionEstimateChildren"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g., 0.2"
                    value={currentRecipeIsAlcoholic ? 0 : consumptionEstimate.children}
                    onChange={e => setConsumptionEstimate(prev => ({ ...prev, children: parseFloat(e.target.value) || 0 }))}
                    disabled={currentRecipeIsAlcoholic}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                  />
                   {currentRecipeIsAlcoholic && <p className="text-xs text-amber-500 mt-1">Drinks alcoólicos não são consumidos por crianças.</p>}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-200 mb-2">Receita</h4>
                <div className="space-y-3">
                  {recipe.map((r, index) => {
                    const selectedIngredient = getIngredientInfo(r.ingredientId);
                    return (
                      <div key={index} className="flex items-center gap-3 p-2 bg-gray-700/50 rounded">
                        <select
                          value={r.ingredientId}
                          onChange={e => handleRecipeChange(index, 'ingredientId', e.target.value)}
                          className="flex-1 bg-gray-600 text-white border border-gray-500 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          {ingredients.map(ing => (
                            <option key={ing.id} value={ing.id}>{ing.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Qtd"
                          value={r.quantity || ''}
                          onChange={e => handleRecipeChange(index, 'quantity', e.target.value)}
                          className="w-24 bg-gray-600 text-white border border-gray-500 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <span className="text-gray-400 w-8">{selectedIngredient?.unit}</span>
                        <button onClick={() => handleRemoveIngredientFromRecipe(index)} className="p-2 text-red-400 hover:text-red-300"><Trash2 size={18} /></button>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={handleAddIngredientToRecipe}
                  disabled={ingredients.length === 0}
                  className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={16} /> Adicionar Insumo
                </button>
                 {ingredients.length === 0 && <p className="text-xs text-amber-500 mt-2">Você precisa cadastrar insumos primeiro.</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-auto p-4 border-t border-gray-700 bg-gray-800 rounded-b-lg">
                <button onClick={closeModal} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors">
                    Cancelar
                </button>
                <button onClick={handleSaveDrink} className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-500 transition-colors">
                    {editingDrink ? 'Salvar Alterações' : 'Salvar Drink'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// --- From components/Simulator.tsx ---
interface SimulatorProps {
  drinks: Drink[];
  ingredients: Ingredient[];
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
}

const Simulator: React.FC<SimulatorProps> = ({ drinks, ingredients, setEvents }) => {
  const [selectedDrinks, setSelectedDrinks] = useState<string[]>([]);
  const [numAdults, setNumAdults] = useState<number>(40);
  const [numChildren, setNumChildren] = useState<number>(10);
  const [eventDuration, setEventDuration] = useState<number>(4); // in hours
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [newStaffMember, setNewStaffMember] = useState({ role: '', cost: 0 });
  const [profitMargin, setProfitMargin] = useState<number>(100);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newEventDetails, setNewEventDetails] = useState({ name: '', startDateTime: '', endDateTime: '' });

  const ingredientMap = useMemo(() => new Map(ingredients.map(i => [i.id, i])), [ingredients]);

  const ingredientCostData = useMemo(() => {
    const map = new Map<string, { avgCost: number }>();
    ingredients.forEach(ing => {
      const totalStock = ing.stockEntries.reduce((sum, entry) => sum + entry.remainingQuantity, 0);
      const totalValue = ing.stockEntries.reduce((sum, entry) => {
        const costPerUnit = entry.quantity > 0 ? entry.price / entry.quantity : 0;
        return sum + costPerUnit * entry.remainingQuantity;
      }, 0);
      const avgCost = totalStock > 0 ? totalValue / totalStock : 0;
      map.set(ing.id, { avgCost });
    });
    return map;
  }, [ingredients]);

  const isDrinkAlcoholic = (drink: Drink): boolean => {
    return drink.ingredients.some(di => ingredientMap.get(di.ingredientId)?.isAlcoholic);
  };

  const costs = useMemo(() => {
    let ingredientCost = 0;
    const totalPeople = numAdults + numChildren;
    if (totalPeople > 0 && eventDuration > 0 && selectedDrinks.length > 0) {
      for (const drinkId of selectedDrinks) {
        const drink = drinks.find(d => d.id === drinkId);
        if (drink) {
          const drinkIsAlcoholic = isDrinkAlcoholic(drink);
          
          const adultServings = numAdults * eventDuration * drink.consumptionEstimate.adults;
          const childrenServings = drinkIsAlcoholic ? 0 : (numChildren * eventDuration * drink.consumptionEstimate.children);
          const totalServings = adultServings + childrenServings;

          if (totalServings > 0) {
            for (const drinkIngredient of drink.ingredients) {
              const costInfo = ingredientCostData.get(drinkIngredient.ingredientId);
              if (costInfo) {
                ingredientCost += costInfo.avgCost * drinkIngredient.quantity * totalServings;
              }
            }
          }
        }
      }
    }

    const operationalCost = staff.reduce((acc, curr) => acc + curr.cost, 0);
    const totalCost = ingredientCost + operationalCost;
    const profit = ingredientCost * (profitMargin / 100);
    const finalPrice = totalCost + profit;
    
    return {
      ingredientCost,
      operationalCost,
      totalCost,
      profit,
      finalPrice,
    };
  }, [selectedDrinks, numAdults, numChildren, eventDuration, staff, profitMargin, drinks, ingredientCostData, ingredientMap]);

  const handleToggleDrink = (drinkId: string) => {
    setSelectedDrinks(prev =>
      prev.includes(drinkId) ? prev.filter(id => id !== drinkId) : [...prev, drinkId]
    );
  };

  const handleAddStaff = () => {
    if (newStaffMember.role && newStaffMember.cost > 0) {
      setStaff([...staff, { ...newStaffMember, id: crypto.randomUUID() }]);
      setNewStaffMember({ role: '', cost: 0 });
    }
  };

  const handleRemoveStaff = (id: string) => {
    setStaff(staff.filter(s => s.id !== id));
  };
  
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  const handleSaveAsEvent = () => {
    const totalPeople = numAdults + numChildren;
    if (!newEventDetails.name || !newEventDetails.startDateTime || !newEventDetails.endDateTime || selectedDrinks.length === 0 || totalPeople <= 0) {
        alert("Preencha todos os campos do evento (nome, data de início e fim) e certifique-se de que há drinks e convidados selecionados.");
        return;
    }

    const startDateTime = new Date(newEventDetails.startDateTime);
    const endDateTime = new Date(newEventDetails.endDateTime);

    if (endDateTime <= startDateTime) {
      alert("A data de término deve ser posterior à data de início.");
      return;
    }

    const newEvent: Event = {
        id: crypto.randomUUID(),
        name: newEventDetails.name,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        status: 'planned',
        numAdults: numAdults,
        numChildren: numChildren,
        selectedDrinks: selectedDrinks,
        simulatedCosts: costs,
    };

    setEvents(prevEvents => [...prevEvents, newEvent].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
    
    setIsSaveModalOpen(false);
    setNewEventDetails({ name: '', startDateTime: '', endDateTime: '' });
  };

  const chartData = [
    { name: 'Insumos', value: costs.ingredientCost, fill: '#f97316' },
    { name: 'Operacional', value: costs.operationalCost, fill: '#fbbf24' },
    { name: 'Lucro', value: costs.profit, fill: '#60a5fa' },
  ];

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna de Configuração */}
        <div className="lg:col-span-1 space-y-6">
          {/* Seleção de Drinks */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-orange-400">1. Selecione os Drinks</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {drinks.map(drink => (
                <label key={drink.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-700/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDrinks.includes(drink.id)}
                    onChange={() => handleToggleDrink(drink.id)}
                    className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <span className="text-white">{drink.name}</span>
                    <p className="text-xs text-amber-400">A: {drink.consumptionEstimate.adults}, C: {drink.consumptionEstimate.children}</p>
                  </div>
                </label>
              ))}
              {drinks.length === 0 && <p className="text-gray-500 text-center">Cadastre drinks na aba 'Drinks'.</p>}
            </div>
          </div>

          {/* Parâmetros do Evento */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-md space-y-6">
            <h3 className="text-xl font-semibold text-orange-400">2. Parâmetros do Evento</h3>
            <div>
              <label htmlFor="numAdults" className="block text-lg font-medium mb-2">Número de Adultos</label>
              <div className="flex items-center gap-3">
                <Users className="text-gray-400" />
                <input id="numAdults" type="range" min="0" max="500" value={numAdults} onChange={e => setNumAdults(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                <span className="text-lg font-bold w-12 text-center">{numAdults}</span>
              </div>
            </div>
             <div>
              <label htmlFor="numChildren" className="block text-lg font-medium mb-2">Número de Crianças</label>
              <div className="flex items-center gap-3">
                <Users className="text-gray-400" />
                <input id="numChildren" type="range" min="0" max="200" value={numChildren} onChange={e => setNumChildren(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                <span className="text-lg font-bold w-12 text-center">{numChildren}</span>
              </div>
            </div>
            <div>
              <label htmlFor="eventDuration" className="block text-lg font-medium mb-2">Duração do Evento (horas)</label>
              <div className="flex items-center gap-3">
                <Clock className="text-gray-400" />
                <input id="eventDuration" type="range" min="1" max="12" step="0.5" value={eventDuration} onChange={e => setEventDuration(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                <span className="text-lg font-bold w-12 text-center">{eventDuration}h</span>
              </div>
            </div>
          </div>

          {/* Custos Operacionais */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-orange-400">3. Custos Operacionais (Equipe)</h3>
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <input type="text" placeholder="Função" value={newStaffMember.role} onChange={e => setNewStaffMember({...newStaffMember, role: e.target.value})} className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  <input type="number" placeholder="Custo" value={newStaffMember.cost || ''} onChange={e => setNewStaffMember({...newStaffMember, cost: Number(e.target.value)})} className="w-full sm:w-28 bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  <button onClick={handleAddStaff} className="p-2 bg-orange-600 text-white rounded-md hover:bg-orange-500"><Plus/></button>
              </div>
              <div className="space-y-2">
                  {staff.map(member => (
                      <div key={member.id} className="flex justify-between items-center bg-gray-700/50 p-2 rounded">
                          <span>{member.role}</span>
                          <span>{formatCurrency(member.cost)}</span>
                          <button onClick={() => handleRemoveStaff(member.id)} className="text-red-400 hover:text-red-300"><Trash2 size={16}/></button>
                      </div>
                  ))}
              </div>
          </div>

          {/* Margem de Lucro */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-md">
            <label htmlFor="profitMargin" className="block text-xl font-semibold mb-4 text-orange-400">4. Margem de Lucro Desejada</label>
            <div className="flex items-center gap-3">
              <Target className="text-gray-400" />
              <input
                  id="profitMargin"
                  type="range"
                  min="0"
                  max="300"
                  value={profitMargin}
                  onChange={e => setProfitMargin(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-lg font-bold w-16 text-center">{profitMargin}%</span>
            </div>
          </div>
        </div>
        
        {/* Coluna de Resultados */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
              <h2 className="text-2xl font-bold text-orange-400 flex items-center gap-3"><BarChart2/>Resultado da Simulação</h2>
              <button 
                onClick={() => setIsSaveModalOpen(true)} 
                disabled={selectedDrinks.length === 0 || (numAdults + numChildren) <= 0 || eventDuration <= 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
                  <Save size={18} />
                  Salvar como Evento
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center mb-8">
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Custo Total</p>
                      <p className="text-2xl font-bold text-white">{formatCurrency(costs.totalCost)}</p>
                  </div>
                  <div className="bg-orange-900/50 border border-orange-500 p-4 rounded-lg">
                      <p className="text-sm text-orange-300">Valor a Cobrar</p>
                      <p className="text-3xl font-bold text-orange-400">{formatCurrency(costs.finalPrice)}</p>
                  </div>
            </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-md">
                    <span className="font-medium text-gray-300">Custo com Insumos</span>
                    <span className="font-bold text-lg text-orange-400">{formatCurrency(costs.ingredientCost)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-md">
                    <span className="font-medium text-gray-300">Custo Operacional</span>
                    <span className="font-bold text-lg text-amber-400">{formatCurrency(costs.operationalCost)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-md">
                    <span className="font-medium text-gray-300">Lucro Estimado</span>
                    <span className="font-bold text-lg text-blue-400">{formatCurrency(costs.profit)}</span>
                </div>
            </div>

            <div className="w-full h-80">
              <h4 className="text-lg font-semibold mb-4 text-center text-gray-300">Composição do Preço Final</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                    <XAxis type="number" stroke="#a0aec0" tickFormatter={formatCurrency} />
                    <YAxis type="category" dataKey="name" stroke="#a0aec0" width={80}/>
                    <Tooltip
                      cursor={{fill: 'rgba(113, 128, 150, 0.1)'}}
                      contentStyle={{ backgroundColor: '#2d3748', border: '1px solid #4a5568', borderRadius: '0.5rem' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="value" barSize={35}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>

          </div>
        </div>
      </div>

      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-xl font-bold text-orange-400">Salvar Simulação como Evento</h3>
              <button onClick={() => setIsSaveModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
               <div>
                  <label htmlFor="eventName" className="block text-sm font-medium text-gray-300 mb-1">Nome do Evento</label>
                  <input id="eventName" type="text" value={newEventDetails.name} onChange={e => setNewEventDetails({...newEventDetails, name: e.target.value})} className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Ex: Aniversário da Maria" />
              </div>
              <div>
                  <label htmlFor="startDateTime" className="block text-sm font-medium text-gray-300 mb-1">Início do Evento</label>
                  <input id="startDateTime" type="datetime-local" value={newEventDetails.startDateTime} onChange={e => setNewEventDetails({...newEventDetails, startDateTime: e.target.value})} className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                  <label htmlFor="endDateTime" className="block text-sm font-medium text-gray-300 mb-1">Fim do Evento</label>
                  <input id="endDateTime" type="datetime-local" value={newEventDetails.endDateTime} onChange={e => setNewEventDetails({...newEventDetails, endDateTime: e.target.value})} className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div className="pt-2 text-sm text-gray-400 border-t border-gray-700 mt-4">
                <p className="font-semibold text-gray-200 mt-2">Resumo da Simulação:</p>
                <p><strong>Drinks:</strong> {selectedDrinks.length} selecionados</p>
                <p><strong>Adultos:</strong> {numAdults}</p>
                <p><strong>Crianças:</strong> {numChildren}</p>
                 <p><strong>Duração:</strong> {eventDuration} horas</p>
                <p><strong>Valor Final Orçado:</strong> {formatCurrency(costs.finalPrice)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
              <button onClick={() => setIsSaveModalOpen(false)} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500">Cancelar</button>
              <button onClick={handleSaveAsEvent} className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-500">Salvar Evento</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


// --- From components/EventManager.tsx ---
interface EventManagerProps {
  events: Event[];
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  drinks: Drink[];
  ingredients: Ingredient[];
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
}

const EventManager: React.FC<EventManagerProps> = ({ events, setEvents, drinks, ingredients, setIngredients }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<{
    name: string;
    startDateTime: string;
    endDateTime: string;
    numAdults: number;
    numChildren: number;
    selectedDrinks: string[];
  }>({
    name: '',
    startDateTime: '',
    endDateTime: '',
    numAdults: 10,
    numChildren: 0,
    selectedDrinks: [],
  });
  
  const drinkMap = useMemo(() => new Map(drinks.map(d => [d.id, d])), [drinks]);
  const ingredientMap = useMemo(() => new Map(ingredients.map(i => [i.id, i])), [ingredients]);

  const openModal = () => {
    setNewEvent({ name: '', startDateTime: '', endDateTime: '', numAdults: 10, numChildren: 0, selectedDrinks: [] });
    setIsModalOpen(true);
  };
  
  const closeModal = () => setIsModalOpen(false);

  const handleSaveEvent = () => {
    if (newEvent.name && newEvent.startDateTime && newEvent.endDateTime && newEvent.selectedDrinks.length > 0) {
      const startDateTime = new Date(newEvent.startDateTime);
      const endDateTime = new Date(newEvent.endDateTime);

       if (endDateTime <= startDateTime) {
        alert("A data de término deve ser posterior à data de início.");
        return;
      }

      const event: Event = {
        id: crypto.randomUUID(),
        name: newEvent.name,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        status: 'planned',
        numAdults: newEvent.numAdults,
        numChildren: newEvent.numChildren,
        selectedDrinks: newEvent.selectedDrinks,
      };
      setEvents([...events, event].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
      closeModal();
    } else {
        alert("Por favor, preencha todos os campos e selecione ao menos um drink.");
    }
  };

  const isDrinkAlcoholic = (drink: Drink): boolean => {
    return drink.ingredients.some(di => ingredientMap.get(di.ingredientId)?.isAlcoholic);
  };

  const handleCompleteEvent = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event || event.status === 'completed') return;

    const ingredientUsage = new Map<string, number>();

    const durationInHours = (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60 * 60);
    if (durationInHours <= 0) {
        console.error("Duração do evento inválida.");
        return;
    }

    // 1. Calculate total ingredient usage based on consumption estimates
    for (const drinkId of event.selectedDrinks) {
        const drink = drinkMap.get(drinkId);
        if (drink) {
            const drinkIsAlcoholic = isDrinkAlcoholic(drink);
            
            const adultServings = event.numAdults * durationInHours * drink.consumptionEstimate.adults;
            const childrenServings = drinkIsAlcoholic ? 0 : (event.numChildren * durationInHours * drink.consumptionEstimate.children);
            const totalServings = adultServings + childrenServings;

            if (totalServings > 0) {
              for (const recipeItem of drink.ingredients) {
                  const currentUsage = ingredientUsage.get(recipeItem.ingredientId) || 0;
                  ingredientUsage.set(recipeItem.ingredientId, currentUsage + (recipeItem.quantity * totalServings));
              }
            }
        }
    }

    // 2. Deduct from stock using FIFO
    setIngredients(prevIngredients => {
      const newIngredients = JSON.parse(JSON.stringify(prevIngredients));

      for (const ing of newIngredients) {
        if (ingredientUsage.has(ing.id)) {
          let neededQuantity = ingredientUsage.get(ing.id) ?? 0;
          
          ing.stockEntries.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          for (const entry of ing.stockEntries) {
            if (neededQuantity <= 0) break;

            const amountToDeduct = Math.min(neededQuantity, entry.remainingQuantity);
            entry.remainingQuantity -= amountToDeduct;
            neededQuantity -= amountToDeduct;
          }
        }
      }
      return newIngredients;
    });
    
    // 3. Update event status
    setEvents(prevEvents =>
        prevEvents.map(e => (e.id === eventId ? { ...e, status: 'completed' } : e))
    );
  };

  const handleDeleteEvent = (eventId: string) => {
    if (confirm("Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.")) {
      setEvents(events.filter(e => e.id !== eventId));
    }
  };
  
  const handleToggleDrink = (drinkId: string) => {
    setNewEvent(prev => ({
        ...prev,
        selectedDrinks: prev.selectedDrinks.includes(drinkId)
            ? prev.selectedDrinks.filter(id => id !== drinkId)
            : [...prev.selectedDrinks, drinkId]
    }));
  };

  const StatusBadge = ({ status }: { status: Event['status'] }) => {
    const baseClasses = "px-2 py-1 text-xs font-bold rounded-full";
    if (status === 'completed') {
        return <span className={`${baseClasses} bg-green-500 text-white`}>Concluído</span>;
    }
    return <span className={`${baseClasses} bg-amber-500 text-white`}>Planejado</span>;
  };
  
  const formatDateTime = (isoString: string) => {
      const date = new Date(isoString);
      return date.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
      });
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-500 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <Plus size={18} />
          Adicionar Novo Evento
        </button>
      </div>

      <div className="p-6 bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-orange-400">Próximos Eventos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.length > 0 ? events.map(event => {
            const durationInHours = (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60 * 60);
            return (
              <div key={event.id} className="bg-gray-700/50 rounded-lg p-5 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-white">{event.name}</h3>
                  <StatusBadge status={event.status} />
                </div>
                <div className="space-y-3 text-sm text-gray-300 mb-4">
                    <p className="flex items-center gap-2"><Calendar size={14} /> {formatDateTime(event.startTime)}</p>
                    <p className="flex items-center gap-2"><Clock size={14} /> Duração: {durationInHours.toFixed(1)} horas</p>
                    <p className="flex items-center gap-2"><Users size={14} /> {event.numAdults} Adultos, {event.numChildren} Crianças</p>
                    {event.simulatedCosts && (
                        <p className="flex items-center gap-2 font-semibold text-orange-300"><DollarSign size={14} /> Valor Orçado: {formatCurrency(event.simulatedCosts.finalPrice)}</p>
                    )}
                </div>
                <div>
                    <h4 className="font-semibold text-gray-200 mb-2">Drinks:</h4>
                    <ul className="text-xs text-gray-400 list-disc list-inside space-y-1">
                        {event.selectedDrinks.map(id => <li key={id}>{drinkMap.get(id)?.name || 'Drink desconhecido'}</li>)}
                    </ul>
                </div>
                 <div className="mt-auto pt-4 flex gap-2 justify-end">
                  {event.status === 'planned' && (
                    <button onClick={() => handleCompleteEvent(event.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-500">
                        <CheckSquare size={14} /> Concluir
                    </button>
                  )}
                  <button onClick={() => handleDeleteEvent(event.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-500">
                      <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </div>
            )
          }) : (
            <p className="text-center text-gray-500 col-span-full">Nenhum evento agendado.</p>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
           <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-xl font-bold text-orange-400">Adicionar Novo Evento</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <input type="text" placeholder="Nome do Evento" value={newEvent.name} onChange={e => setNewEvent({...newEvent, name: e.target.value})} className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                  <label className="text-sm text-gray-400">Início do Evento</label>
                  <input type="datetime-local" value={newEvent.startDateTime} onChange={e => setNewEvent({...newEvent, startDateTime: e.target.value})} className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2" />
                </div>
                 <div>
                  <label className="text-sm text-gray-400">Fim do Evento</label>
                  <input type="datetime-local" value={newEvent.endDateTime} onChange={e => setNewEvent({...newEvent, endDateTime: e.target.value})} className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="number" placeholder="Nº de Adultos" value={newEvent.numAdults} onChange={e => setNewEvent({...newEvent, numAdults: parseInt(e.target.value)})} className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2" />
                <input type="number" placeholder="Nº de Crianças" value={newEvent.numChildren} onChange={e => setNewEvent({...newEvent, numChildren: parseInt(e.target.value)})} className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-200 mb-2">Selecione os Drinks</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-700/50 rounded">
                    {drinks.map(drink => (
                         <label key={drink.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-600 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={newEvent.selectedDrinks.includes(drink.id)}
                                onChange={() => handleToggleDrink(drink.id)}
                                className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-orange-600 focus:ring-orange-500"
                            />
                            <span className="text-white text-sm">{drink.name}</span>
                        </label>
                    ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-700 mt-auto">
              <button onClick={closeModal} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500">Cancelar</button>
              <button onClick={handleSaveEvent} className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-500">Salvar Evento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// --- From App.tsx ---
type Tab = 'ingredients' | 'drinks' | 'simulator' | 'events' | 'stock';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('simulator');
  const [ingredients, setIngredients] = useLocalStorage<Ingredient[]>('ingredients', []);
  const [drinks, setDrinks] = useLocalStorage<Drink[]>('drinks', []);
  const [events, setEvents] = useLocalStorage<Event[]>('events', []);

  const renderContent = () => {
    switch (activeTab) {
      case 'ingredients':
        return <IngredientManager ingredients={ingredients} setIngredients={setIngredients} />;
      case 'stock':
        return <StockManager ingredients={ingredients} setIngredients={setIngredients} />;
      case 'drinks':
        return <DrinkManager drinks={drinks} setDrinks={setDrinks} ingredients={ingredients} />;
      case 'simulator':
        return <Simulator drinks={drinks} ingredients={ingredients} setEvents={setEvents} />;
      case 'events':
        return <EventManager events={events} setEvents={setEvents} drinks={drinks} ingredients={ingredients} setIngredients={setIngredients} />;
      default:
        return null;
    }
  };

  const TabButton = ({ tab, label, icon }: { tab: Tab; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex-1 flex items-center justify-center gap-2 px-2 sm:px-4 py-3 text-sm md:text-base font-medium rounded-t-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 ${
        activeTab === tab ? 'bg-gray-800 text-orange-400' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 font-sans">
      <header className="bg-gray-800 shadow-lg shadow-black/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl md:text-3xl font-bold text-white text-center tracking-wider flex items-center justify-center gap-3">
            <Martini className="text-orange-400" size={32} />
            CalculaDrink
          </h1>
          <p className="text-center text-gray-400 mt-1">Calculadora de Custos e Lucratividade para Coquetelaria</p>
        </div>
      </header>
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-gray-900 border-b border-gray-700 mb-6">
          <nav className="flex -mb-px">
            <TabButton tab="simulator" label="Simulador" icon={<Calculator size={18} />} />
            <TabButton tab="events" label="Eventos" icon={<Calendar size={18} />} />
            <TabButton tab="drinks" label="Drinks" icon={<Martini size={18} />} />
            <TabButton tab="ingredients" label="Insumos" icon={<Droplets size={18} />} />
            <TabButton tab="stock" label="Estoque" icon={<Package size={18} />} />
          </nav>
        </div>
        {renderContent()}
      </main>
    </div>
  );
};


// --- Original index.tsx render logic ---
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
