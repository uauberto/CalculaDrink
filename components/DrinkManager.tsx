import React, { useState, useMemo } from 'react';
import type { Drink, DrinkIngredient, Ingredient } from '../types';
import { Plus, Trash2, Edit, X, TrendingUp } from 'lucide-react';

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

export default DrinkManager;