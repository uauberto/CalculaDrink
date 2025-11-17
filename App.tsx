
import React, { useState } from 'react';
import type { Drink, Ingredient, Event } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import IngredientManager from './components/IngredientManager';
import DrinkManager from './components/DrinkManager';
import Simulator from './components/Simulator';
import EventManager from './components/EventManager';
import StockManager from './components/StockManager';
import { Martini, Droplets, Calculator, Calendar, Package } from 'lucide-react';

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
          {/* FIX: Complete the nav tag and its children */}
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

// FIX: Add default export for the App component
export default App;
