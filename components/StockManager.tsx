import React, { useState, useMemo } from 'react';
import type { Ingredient, StockEntry } from '../types.ts';
import { PackagePlus, History, X, AlertTriangle, MinusCircle } from 'lucide-react';

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
                    <td className="p-3 font-medium flex items-center gap-2">{ing.name} {isLowStock && <span title="Estoque baixo!"><AlertTriangle className="text-red-400" size={16} /></span>}</td>
                    <td className="p-3 font-medium">{totalStock.toFixed(2)} {ing.unit}</td>
                    <td className="p-3">{formatCurrency(avgCost)} / {ing.unit}</td>
                    <td className="p-3 font-semibold">{formatCurrency(totalValue)}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button onClick={() => setAddStockModal(ing)} className="p-2 text-green-400 hover:text-green-300" aria-label="Adicionar Estoque">
                          <span title="Adicionar Estoque"><PackagePlus size={18} /></span>
                        </button>
                        <button onClick={() => setHistoryModal(ing)} className="p-2 text-blue-400 hover:text-blue-300" aria-label="Ver Histórico">
                          <span title="Ver Histórico"><History size={18} /></span>
                        </button>
                        <button onClick={() => setAdjustStockModal(ing)} className="p-2 text-yellow-400 hover:text-yellow-300" aria-label="Ajustar Estoque">
                          <span title="Ajustar Estoque"><MinusCircle size={18} /></span>
                        </button>
                      </div>
                    </td>
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
                    <div className="flex gap-1">
                      <button onClick={() => setAddStockModal(ing)} className="p-2 text-green-400" aria-label="Adicionar Estoque">
                        <span title="Adicionar Estoque"><PackagePlus size={20} /></span>
                      </button>
                      <button onClick={() => setHistoryModal(ing)} className="p-2 text-blue-400" aria-label="Ver Histórico">
                        <span title="Ver Histórico"><History size={20} /></span>
                      </button>
                      <button onClick={() => setAdjustStockModal(ing)} className="p-2 text-yellow-400" aria-label="Ajustar Estoque">
                        <span title="Ajustar Estoque"><MinusCircle size={20} /></span>
                      </button>
                    </div>
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

export default StockManager;