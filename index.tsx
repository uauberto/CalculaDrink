
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Plus, Trash2, Edit, Upload, FileSpreadsheet, HelpCircle, TrendingUp, DollarSign, AlertCircle, X, 
  Users, Target, BarChart2, Save, Clock, RotateCcw, Calendar, FileText, CheckSquare, 
  PackagePlus, History, AlertTriangle, MinusCircle, Package, Martini, Droplets, Calculator, 
  LogOut, Shield, ArrowLeft, Loader2, Building2, User, Briefcase, LogIn, Phone, Mail, CheckCircle2, 
  Lock, Eye, EyeOff, KeyRound, RefreshCw, Copy, Filter, MoreHorizontal, Unlock, XCircle, CheckCircle,
  CreditCard, Star, ShieldAlert
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- CONFIGURATION ---
const SUPABASE_URL = "https://hddckdbulgklubqvfsdi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZGNrZGJ1bGdrbHVicXZmc2RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NjMyNTcsImV4cCI6MjA3OTMzOTI1N30.QwlaVYETwcN91Nb1jlfXrZdkvhrUX0BfUL_x7bi1Dv4";
const ENABLE_DATABASE = true;
const MASTER_EMAIL = "contato@d2am.com";
const DEFAULT_PASSWORD = "123456";

// --- TYPES ---
interface StockEntry {
  id: string;
  date: string;
  quantity: number;
  price: number;
  remainingQuantity: number;
}

interface Ingredient {
  id:string;
  name: string;
  unit: 'ml' | 'l' | 'g' | 'kg' | 'un';
  isAlcoholic: boolean;
  stockEntries: StockEntry[];
  lowStockThreshold?: number;
}

interface DrinkIngredient {
  ingredientId: string;
  quantity: number;
}

interface Drink {
  id: string;
  name: string;
  ingredients: DrinkIngredient[];
  consumptionEstimate: {
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
  startTime: string;
  endTime: string;
  status: 'planned' | 'completed';
  numAdults: number;
  numChildren: number;
  selectedDrinks: string[];
  staff?: StaffMember[];
  simulatedCosts?: {
    ingredientCost: number;
    operationalCost: number;
    totalCost: number;
    profit: number;
    finalPrice: number;
  };
}

type CompanyStatus = 'pending_approval' | 'waiting_payment' | 'active' | 'suspended';
type PlanType = 'monthly' | 'yearly' | null;
type CompanyType = 'PF' | 'PJ';
type UserRole = 'admin' | 'manager' | 'bartender';

interface Company {
  id: string;
  name: string;
  createdAt: string;
  status: CompanyStatus;
  plan: PlanType;
  nextBillingDate: string | null;
  role: UserRole;
  type: CompanyType;
  document: string;
  email: string;
  phone: string;
  responsibleName: string;
  requiresPasswordChange?: boolean;
}

// --- HOOKS ---
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
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
          ? (storedValue as any)(storedValue)
          : storedValue;
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

// --- LIB: SUPABASE ---
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SETUP_SQL = `
-- COPIE E RODE ISSO NO SQL EDITOR DO SUPABASE --
create extension if not exists "pgcrypto";

create table if not exists companies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  status text default 'pending_approval',
  plan text,
  next_billing_date timestamp with time zone,
  created_at timestamp with time zone default now(),
  type text default 'PJ',
  document text,
  email text,
  phone text,
  responsible_name text,
  role text default 'admin',
  password text
);
alter table companies add column if not exists password text;
alter table companies drop constraint if exists companies_document_key;
alter table companies add constraint companies_document_key unique (document);
alter table companies drop constraint if exists companies_email_key;
alter table companies add constraint companies_email_key unique (email);
alter table companies enable row level security;
-- Politica permissiva para permitir login (Select) e cadastro (Insert) sem auth do Supabase
create policy "Public Access" on companies for all using (true);

create table if not exists ingredients (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references companies(id) not null,
  name text not null,
  unit text not null,
  is_alcoholic boolean default false,
  low_stock_threshold numeric default 0,
  created_at timestamp with time zone default now()
);

create table if not exists stock_entries (
  id uuid default gen_random_uuid() primary key,
  ingredient_id uuid references ingredients(id) on delete cascade not null,
  date date default current_date,
  quantity numeric not null,
  price numeric not null,
  remaining_quantity numeric not null,
  created_at timestamp with time zone default now()
);

create table if not exists drinks (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references companies(id) not null,
  name text not null,
  adults_estimate numeric default 0.5,
  children_estimate numeric default 0,
  created_at timestamp with time zone default now()
);

create table if not exists drink_ingredients (
  id uuid default gen_random_uuid() primary key,
  drink_id uuid references drinks(id) on delete cascade not null,
  ingredient_id uuid references ingredients(id) on delete cascade not null,
  quantity numeric not null
);

create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references companies(id) not null,
  name text not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  status text default 'planned',
  num_adults numeric default 0,
  num_children numeric default 0,
  simulated_final_price numeric,
  created_at timestamp with time zone default now()
);

create table if not exists event_drinks (
  event_id uuid references events(id) on delete cascade not null,
  drink_id uuid references drinks(id) on delete cascade not null,
  primary key (event_id, drink_id)
);

create table if not exists event_staff (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references events(id) on delete cascade not null,
  role text not null,
  cost numeric not null
);
`;

const handleDatabaseError = (error: any, context: string) => {
    let errorMsg = '';
    try { errorMsg = JSON.stringify(error, null, 2); } catch (e) { errorMsg = String(error); }
    console.error(`Erro em ${context}:`, errorMsg);
    if (error?.code === 'PGRST205' || error?.code === '42P01' || error?.code === 'PGRST204') {
        console.group("🚨 BANCO DE DADOS NÃO CONFIGURADO 🚨");
        console.log("%c▼ COPIE O SCRIPT ABAIXO E RODE NO SQL EDITOR DO SUPABASE ▼", "color: orange; font-weight: bold; font-size: 12px;");
        console.log(SETUP_SQL);
        console.groupEnd();
        return true;
    }
    return false;
};

// Mappers
function mapDatabaseToCompany(db: any): Company {
    return {
        id: db.id, name: db.name, createdAt: db.created_at, status: db.status, plan: db.plan, nextBillingDate: db.next_billing_date, type: db.type || 'PJ', document: db.document || '', email: db.email || '', phone: db.phone || '', responsibleName: db.responsible_name || '', role: db.role || 'admin'
    };
}
function mapCompanyToDatabase(app: Company): any {
    return {
        id: app.id, name: app.name, status: app.status, plan: app.plan, next_billing_date: app.nextBillingDate, type: app.type, document: app.document, email: app.email, phone: app.phone, responsible_name: app.responsibleName, role: app.role
    };
}
function mapDatabaseToIngredient(db: any): Ingredient {
    return {
        id: db.id, name: db.name, unit: db.unit, isAlcoholic: db.is_alcoholic, lowStockThreshold: db.low_stock_threshold, stockEntries: db.stock_entries ? db.stock_entries.map((se: any) => ({ id: se.id, date: se.date, quantity: se.quantity, price: se.price, remainingQuantity: se.remaining_quantity })) : []
    };
}

const api = {
  auth: {
    login: async (document: string, email: string, password?: string): Promise<Company | null> => {
      try {
        const { data, error } = await supabase.from('companies').select('*').eq('document', document).ilike('email', email.trim()).maybeSingle(); 
        if (error) throw error;
        if (!data) return null;
        if (data.password && password) {
            if (data.password !== password) { console.error("Senha incorreta."); return null; }
        }
        return mapDatabaseToCompany(data);
      } catch (error: any) {
        const isSetupError = handleDatabaseError(error, 'Login');
        if (isSetupError) throw new Error("TABELAS_NAO_ENCONTRADAS");
        return null;
      }
    },
    register: async (company: Company, password?: string): Promise<Company | null> => {
      try {
        const dbPayload = mapCompanyToDatabase(company);
        if (password) dbPayload.password = password;
        const { data, error } = await supabase.from('companies').insert(dbPayload).select().single();
        if (error) throw error;
        return mapDatabaseToCompany(data);
      } catch (error: any) {
        const isSetupError = handleDatabaseError(error, 'Registro');
        if (isSetupError) throw new Error("TABELAS_NAO_ENCONTRADAS");
        return null;
      }
    },
    update: async (company: Company): Promise<boolean> => {
        try {
            const dbPayload = mapCompanyToDatabase(company);
            delete dbPayload.password;
            const { error } = await supabase.from('companies').update(dbPayload).eq('id', company.id);
            if (error) throw error;
            return true;
        } catch (error: any) {
            handleDatabaseError(error, 'Atualizar Empresa');
            return false;
        }
    }
  },
  ingredients: {
      list: async (companyId: string): Promise<Ingredient[]> => {
          const { data, error } = await supabase.from('ingredients').select('*, stock_entries(*)').eq('company_id', companyId);
          if (error) { handleDatabaseError(error, 'Listar Insumos'); return []; }
          return data.map(mapDatabaseToIngredient);
      },
      save: async (companyId: string, ingredient: Ingredient): Promise<Ingredient | null> => {
          try {
              const { stockEntries, id, ...ingData } = ingredient;
              const { data: savedIng, error: ingError } = await supabase.from('ingredients').upsert({
                    id: id, company_id: companyId, name: ingData.name, unit: ingData.unit, is_alcoholic: ingData.isAlcoholic, low_stock_threshold: ingData.lowStockThreshold
                }).select().single();
              if (ingError || !savedIng) throw ingError;
              if (stockEntries && stockEntries.length > 0) {
                  const entriesPayload = stockEntries.map(entry => ({
                      id: entry.id, ingredient_id: savedIng.id, date: entry.date, quantity: entry.quantity, price: entry.price, remaining_quantity: entry.remainingQuantity
                  }));
                  await supabase.from('stock_entries').upsert(entriesPayload);
              }
              return mapDatabaseToIngredient(savedIng);
          } catch (error: any) { handleDatabaseError(error, 'Salvar Insumo'); return null; }
      },
      delete: async (id: string) => {
          const { error } = await supabase.from('ingredients').delete().eq('id', id);
          if (error) handleDatabaseError(error, 'Deletar Insumo');
      }
  },
  drinks: {
      list: async (companyId: string): Promise<Drink[]> => {
          const { data, error } = await supabase.from('drinks').select('*, drink_ingredients(*)').eq('company_id', companyId);
          if (error) { handleDatabaseError(error, 'Listar Drinks'); return []; }
          return data.map((d: any) => ({
              id: d.id, name: d.name, consumptionEstimate: { adults: d.adults_estimate, children: d.children_estimate },
              ingredients: d.drink_ingredients.map((di: any) => ({ ingredientId: di.ingredient_id, quantity: di.quantity }))
          }));
      },
      save: async (companyId: string, drink: Drink): Promise<boolean> => {
          try {
              const { error: drinkError } = await supabase.from('drinks').upsert({
                  id: drink.id, company_id: companyId, name: drink.name, adults_estimate: drink.consumptionEstimate.adults, children_estimate: drink.consumptionEstimate.children
              });
              if (drinkError) throw drinkError;
              await supabase.from('drink_ingredients').delete().eq('drink_id', drink.id);
              if (drink.ingredients.length > 0) {
                  const { error: ingError } = await supabase.from('drink_ingredients').insert(
                      drink.ingredients.map(di => ({ drink_id: drink.id, ingredient_id: di.ingredientId, quantity: di.quantity }))
                  );
                  if (ingError) throw ingError;
              }
              return true;
          } catch (error: any) { handleDatabaseError(error, 'Salvar Drink'); return false; }
      },
      delete: async (id: string) => {
          const { error } = await supabase.from('drinks').delete().eq('id', id);
          if (error) handleDatabaseError(error, 'Deletar Drink');
      }
  },
  events: {
      list: async (companyId: string): Promise<Event[]> => {
          const { data, error } = await supabase.from('events').select('*, event_staff(*), event_drinks(*)').eq('company_id', companyId);
          if (error) { handleDatabaseError(error, 'Listar Eventos'); return []; }
          return data.map((e: any) => ({
              id: e.id, name: e.name, startTime: e.start_time, endTime: e.end_time, status: e.status, numAdults: e.num_adults, numChildren: e.num_children,
              selectedDrinks: e.event_drinks.map((ed: any) => ed.drink_id),
              staff: e.event_staff.map((es: any) => ({ id: es.id, role: es.role, cost: es.cost })),
              simulatedCosts: e.simulated_final_price ? { finalPrice: e.simulated_final_price } : undefined
          }));
      },
      save: async (companyId: string, event: Event): Promise<boolean> => {
          try {
            const { error: eventError } = await supabase.from('events').upsert({
                id: event.id, company_id: companyId, name: event.name, start_time: event.startTime, end_time: event.endTime, status: event.status,
                num_adults: event.numAdults, num_children: event.numChildren, simulated_final_price: event.simulatedCosts?.finalPrice
            });
            if (eventError) throw eventError;
            await supabase.from('event_drinks').delete().eq('event_id', event.id);
            if (event.selectedDrinks.length > 0) {
                await supabase.from('event_drinks').insert(event.selectedDrinks.map(drinkId => ({ event_id: event.id, drink_id: drinkId })));
            }
            await supabase.from('event_staff').delete().eq('event_id', event.id);
            if (event.staff && event.staff.length > 0) {
                await supabase.from('event_staff').insert(event.staff.map(s => ({ event_id: event.id, role: s.role, cost: s.cost })));
            }
            return true;
          } catch (error: any) { handleDatabaseError(error, 'Salvar Evento'); return false; }
      },
      delete: async (id: string) => {
           const { error } = await supabase.from('events').delete().eq('id', id);
           if (error) handleDatabaseError(error, 'Deletar Evento');
      }
  },
  admin: {
      listAllCompanies: async (): Promise<Company[]> => {
          const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
          if (error) { handleDatabaseError(error, 'Admin List'); return []; }
          return data.map(mapDatabaseToCompany);
      },
      updateCompanyStatus: async (id: string, status: Company['status']): Promise<boolean> => {
           const { error } = await supabase.from('companies').update({ status: status }).eq('id', id);
           if (error) handleDatabaseError(error, 'Admin Update Status');
           return !error;
      },
      updateCompanyRole: async (id: string, role: string): Promise<boolean> => {
          const { error } = await supabase.from('companies').update({ role: role }).eq('id', id);
          if (error) handleDatabaseError(error, 'Admin Update Role');
          return !error;
      },
      resetUserPassword: async (id: string, newPassword: string): Promise<boolean> => {
          const { error } = await supabase.from('companies').update({ password: newPassword }).eq('id', id);
          if (error) handleDatabaseError(error, 'Admin Reset Password');
          return !error;
      }
  }
};

// --- UTILS: PDF ---
const generateProposalPDF = (event: Event, company: Company, fullDrinks: Drink[], staff: StaffMember[]) => {
  const doc: any = new jsPDF();
  const primaryColor = [234, 88, 12]; 
  const secondaryColor = [31, 41, 55];
  
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, 15, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Responsável: ${company.responsibleName}`, 15, 28);
  doc.text(`Contato: ${company.email} | ${company.phone}`, 15, 34);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text("PROPOSTA DE EVENTO", 195, 25, { align: 'right' });

  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Evento: ${event.name}`, 15, 55);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${start.toLocaleDateString('pt-BR')}`, 15, 62);
  doc.text(`Horário: ${start.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})} às ${end.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`, 15, 68);
  doc.text(`Duração: ${duration.toFixed(1)} horas`, 15, 74);
  doc.text(`Convidados: ${event.numAdults} Adultos, ${event.numChildren} Crianças`, 15, 80);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("CARTA DE DRINKS SELECIONADA", 15, 95);
  const drinksData = fullDrinks.map(d => [d.name]);
  autoTable(doc, { startY: 100, head: [['Nome do Drink']], body: drinksData, theme: 'grid', headStyles: { fillColor: primaryColor, textColor: 255 }, styles: { fontSize: 10, cellPadding: 3 } });
  let currentY = (doc as any).lastAutoTable.finalY + 15;

  if (staff && staff.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("EQUIPE OPERACIONAL", 15, currentY);
    const staffData = staff.map(s => [s.role, `R$ ${s.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]);
    autoTable(doc, { startY: currentY + 5, head: [['Função', 'Custo Estimado']], body: staffData, theme: 'grid', headStyles: { fillColor: secondaryColor, textColor: 255 }, styles: { fontSize: 10, cellPadding: 3 } });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  doc.setFillColor(240, 240, 240);
  doc.rect(120, currentY, 75, 30, 'F');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("VALOR TOTAL ESTIMADO", 157, currentY + 10, { align: 'center' });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  const finalPrice = event.simulatedCosts?.finalPrice || 0;
  doc.text(`R$ ${finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 157, currentY + 22, { align: 'center' });
  
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')} por ${company.responsibleName}`, 105, pageHeight - 10, { align: 'center' });
  doc.text("CalculaDrink - Gestão Inteligente de Bares", 105, pageHeight - 6, { align: 'center' });
  doc.save(`Proposta_${event.name.replace(/\s+/g, '_')}.pdf`);
};

// --- COMPONENTS ---

const LogoCD = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M 45 15 A 35 35 0 1 0 45 85" stroke="currentColor" strokeWidth="14" strokeLinecap="butt"/>
        <path d="M 55 15 L 55 85 A 35 35 0 0 0 55 15" stroke="currentColor" strokeWidth="14" strokeLinecap="butt"/>
    </svg>
);

const IngredientManager: React.FC<{ingredients: Ingredient[], setIngredients: any, company: Company}> = ({ ingredients, setIngredients, company }) => {
  const [newIngredient, setNewIngredient] = useLocalStorage<Omit<Ingredient, 'id' | 'stockEntries'>>(`${company.id}_ing_new`, { name: '', unit: 'ml', isAlcoholic: false, lowStockThreshold: 0 });
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading] = useState(false);

  const handleAdd = async () => {
    if (!newIngredient.name) return;
    let newItem: Ingredient;
    if (isEditing) {
       newItem = { ...ingredients.find(i => i.id === isEditing)!, ...newIngredient };
       if (ENABLE_DATABASE) await api.ingredients.save(company.id, newItem);
       setIngredients(ingredients.map(ing => ing.id === isEditing ? newItem : ing));
       setIsEditing(null);
    } else {
       newItem = { ...newIngredient, id: crypto.randomUUID(), stockEntries: [] };
       if (ENABLE_DATABASE) await api.ingredients.save(company.id, newItem);
       setIngredients([...ingredients, newItem]);
    }
    setNewIngredient({ name: '', unit: 'ml', isAlcoholic: false, lowStockThreshold: 0 });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Excluir insumo?")) {
        if (ENABLE_DATABASE) await api.ingredients.delete(id);
        setIngredients(ingredients.filter(ing => ing.id !== id));
    }
  };

  const handleFileUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: async (results) => {
            let count = 0;
            for (const row of results.data as any[]) {
                const name = row['Nome'] || row['Name'];
                if (name) {
                    const newIng = { id: crypto.randomUUID(), name, unit: row['Unidade'] || 'ml', isAlcoholic: row['Alcoolico'] === 'sim', lowStockThreshold: parseFloat(row['Alerta'] || '0'), stockEntries: [] };
                    if (ENABLE_DATABASE) await api.ingredients.save(company.id, newIng as any);
                    setIngredients((prev: any) => [...prev, newIng]);
                    count++;
                }
            }
            alert(`Importados: ${count}`);
            setImportLoading(false);
        } 
    });
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gray-800 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-orange-400">{isEditing ? 'Editar' : 'Novo'} Insumo</h2>
            <div className="flex gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-green-700 text-white rounded text-sm">{importLoading ? '...' : <Upload size={16} />} Importar</button>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <input type="text" placeholder="Nome" value={newIngredient.name} onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })} className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2" />
          <select value={newIngredient.unit} onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value as any })} className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2">
            <option value="ml">ml</option><option value="l">l</option><option value="g">g</option><option value="kg">kg</option><option value="un">un</option>
          </select>
          <input type="number" placeholder="Alerta Estoque" value={newIngredient.lowStockThreshold || ''} onChange={(e) => setNewIngredient({ ...newIngredient, lowStockThreshold: parseFloat(e.target.value) })} className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2" />
          <label className="flex items-center gap-2 cursor-pointer text-gray-300"><input type="checkbox" checked={newIngredient.isAlcoholic} onChange={(e) => setNewIngredient({ ...newIngredient, isAlcoholic: e.target.checked })} className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-orange-600" /> É Alcoólico?</label>
        </div>
        <div className="flex justify-end gap-3 mt-4">
            {isEditing && <button onClick={() => { setIsEditing(null); setNewIngredient({ name: '', unit: 'ml', isAlcoholic: false, lowStockThreshold: 0 }); }} className="px-4 py-2 bg-gray-600 text-white rounded">Cancelar</button>}
            <button onClick={handleAdd} className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-500"><Plus size={18} /> Salvar</button>
        </div>
      </div>
      <div className="p-6 bg-gray-800 rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b border-gray-700"><th className="p-3">Nome</th><th className="p-3">Unidade</th><th className="p-3">Alcoólico</th><th className="p-3">Ações</th></tr></thead>
            <tbody>
              {ingredients.map(ing => (
                  <tr key={ing.id} className="border-b border-gray-700">
                    <td className="p-3">{ing.name}</td><td className="p-3">{ing.unit}</td><td className="p-3">{ing.isAlcoholic ? 'Sim' : 'Não'}</td>
                    <td className="p-3 flex gap-2">
                        <button onClick={() => { setIsEditing(ing.id); setNewIngredient(ing); }} className="text-blue-400"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(ing.id)} className="text-red-400"><Trash2 size={18} /></button>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
      </div>
    </div>
  );
};

const StockManager: React.FC<{ingredients: Ingredient[], setIngredients: any, company: Company}> = ({ ingredients, setIngredients, company }) => {
  const [addModal, setAddModal] = useState<Ingredient | null>(null);
  const [newEntry, setNewEntry] = useState({ date: new Date().toISOString().split('T')[0], quantity: 0, price: 0 });
  
  const handleAddEntry = async () => {
      if (!addModal) return;
      const entry: StockEntry = { id: crypto.randomUUID(), date: newEntry.date, quantity: newEntry.quantity, price: newEntry.price, remainingQuantity: newEntry.quantity };
      const updatedIng = { ...addModal, stockEntries: [...addModal.stockEntries, entry] };
      if (ENABLE_DATABASE) await api.ingredients.save(company.id, updatedIng);
      setIngredients(ingredients.map(i => i.id === updatedIng.id ? updatedIng : i));
      setAddModal(null);
  };

  return (
      <div className="p-6 bg-gray-800 rounded-lg">
          <h2 className="text-2xl font-bold text-orange-400 mb-4">Estoque</h2>
          {addModal && (
             <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                 <div className="bg-gray-800 p-6 rounded shadow-xl w-96 space-y-4">
                     <h3 className="font-bold">Adicionar ao {addModal.name}</h3>
                     <input type="date" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} className="w-full bg-gray-700 border-gray-600 rounded p-2 text-white" />
                     <input type="number" placeholder="Quantidade" onChange={e => setNewEntry({...newEntry, quantity: parseFloat(e.target.value)})} className="w-full bg-gray-700 border-gray-600 rounded p-2 text-white" />
                     <input type="number" placeholder="Preço Total" onChange={e => setNewEntry({...newEntry, price: parseFloat(e.target.value)})} className="w-full bg-gray-700 border-gray-600 rounded p-2 text-white" />
                     <div className="flex justify-end gap-2"><button onClick={() => setAddModal(null)} className="px-3 py-1 bg-gray-600 rounded">Cancelar</button><button onClick={handleAddEntry} className="px-3 py-1 bg-orange-600 rounded">Salvar</button></div>
                 </div>
             </div>
          )}
          <table className="w-full text-left">
              <thead><tr className="border-b border-gray-700"><th className="p-3">Insumo</th><th className="p-3">Total Estoque</th><th className="p-3">Ações</th></tr></thead>
              <tbody>
                  {ingredients.map(ing => {
                      const total = ing.stockEntries.reduce((acc, e) => acc + e.remainingQuantity, 0);
                      return (
                          <tr key={ing.id} className="border-b border-gray-700">
                              <td className="p-3">{ing.name}</td>
                              <td className="p-3">{total} {ing.unit}</td>
                              <td className="p-3"><button onClick={() => setAddModal(ing)} className="text-green-400"><PackagePlus size={18}/></button></td>
                          </tr>
                      )
                  })}
              </tbody>
          </table>
      </div>
  )
}

const DrinkManager: React.FC<{drinks: Drink[], setDrinks: any, ingredients: Ingredient[], company: Company}> = ({ drinks, setDrinks, ingredients, company }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [newDrink, setNewDrink] = useState<any>({ name: '', ingredients: [], consumptionEstimate: { adults: 0.5, children: 0 } });

    const handleSave = async () => {
        const drink: Drink = { id: crypto.randomUUID(), ...newDrink };
        if (ENABLE_DATABASE) await api.drinks.save(company.id, drink);
        setDrinks([...drinks, drink]);
        setModalOpen(false);
    };

    return (
        <div className="p-6 bg-gray-800 rounded-lg">
             <div className="flex justify-between mb-4">
                 <h2 className="text-2xl font-bold text-orange-400">Drinks</h2>
                 <button onClick={() => setModalOpen(true)} className="bg-orange-600 text-white px-4 py-2 rounded"><Plus size={18} /> Novo Drink</button>
             </div>
             {modalOpen && (
                 <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                     <div className="bg-gray-800 p-6 rounded w-full max-w-md space-y-4">
                         <h3 className="font-bold text-white">Novo Drink</h3>
                         <input type="text" placeholder="Nome" onChange={e => setNewDrink({...newDrink, name: e.target.value})} className="w-full bg-gray-700 text-white p-2 rounded"/>
                         <div className="space-y-2">
                             <p className="text-sm text-gray-400">Ingredientes:</p>
                             {ingredients.map(ing => (
                                 <div key={ing.id} className="flex items-center gap-2">
                                     <input type="checkbox" onChange={e => {
                                         if(e.target.checked) setNewDrink({...newDrink, ingredients: [...newDrink.ingredients, {ingredientId: ing.id, quantity: 0}]});
                                         else setNewDrink({...newDrink, ingredients: newDrink.ingredients.filter((i:any) => i.ingredientId !== ing.id)});
                                     }}/>
                                     <span className="text-white text-sm">{ing.name}</span>
                                     {newDrink.ingredients.find((i:any) => i.ingredientId === ing.id) && (
                                         <input type="number" placeholder="Qtd" className="w-20 bg-gray-700 text-white p-1 text-xs rounded" onChange={e => {
                                             const updated = newDrink.ingredients.map((i:any) => i.ingredientId === ing.id ? {...i, quantity: parseFloat(e.target.value)} : i);
                                             setNewDrink({...newDrink, ingredients: updated});
                                         }}/>
                                     )}
                                 </div>
                             ))}
                         </div>
                         <button onClick={handleSave} className="w-full bg-orange-600 text-white py-2 rounded">Salvar</button>
                         <button onClick={() => setModalOpen(false)} className="w-full bg-gray-600 text-white py-2 rounded">Cancelar</button>
                     </div>
                 </div>
             )}
             <div className="space-y-2">
                 {drinks.map(d => <div key={d.id} className="p-3 bg-gray-700 rounded text-white">{d.name}</div>)}
             </div>
        </div>
    )
}

const Simulator: React.FC<{drinks: Drink[], ingredients: Ingredient[], setEvents: any, company: Company}> = ({ drinks, ingredients, setEvents, company }) => {
    const [selected, setSelected] = useState<string[]>([]);
    const [adults, setAdults] = useState(50);
    const [cost, setCost] = useState(0);
    
    const calculate = () => {
        let total = 0;
        // Simulação simplificada para evitar complexidade no arquivo único
        selected.forEach(id => {
            const drink = drinks.find(d => d.id === id);
            if (drink) total += (adults * 0.5 * 10); // Custo fixo estimado R$10 por drink
        });
        setCost(total);
    };
    
    useEffect(calculate, [selected, adults]);

    return (
        <div className="p-6 bg-gray-800 rounded-lg text-white">
            <h2 className="text-2xl font-bold text-orange-400 mb-4">Simulador</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-bold mb-2">Selecione os Drinks</h3>
                    <div className="max-h-60 overflow-y-auto bg-gray-700 p-2 rounded space-y-2">
                        {drinks.map(d => (
                            <label key={d.id} className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={selected.includes(d.id)} onChange={() => setSelected(prev => prev.includes(d.id) ? prev.filter(i => i !== d.id) : [...prev, d.id])} />
                                {d.name}
                            </label>
                        ))}
                    </div>
                    <div className="mt-4">
                        <label className="block mb-1">Convidados: {adults}</label>
                        <input type="range" min="10" max="500" value={adults} onChange={e => setAdults(parseInt(e.target.value))} className="w-full"/>
                    </div>
                </div>
                <div className="bg-gray-900 p-6 rounded flex flex-col items-center justify-center">
                     <p className="text-gray-400">Custo Estimado</p>
                     <p className="text-4xl font-bold text-orange-500">R$ {cost.toFixed(2)}</p>
                     
                     {/* CSS CHART REPLACEMENT FOR RECHARTS */}
                     <div className="w-full mt-8 space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="w-20 text-right text-gray-400">Insumos</span>
                            <div className="flex-1 h-4 bg-gray-700 rounded overflow-hidden">
                                <div className="h-full bg-orange-500" style={{ width: `${Math.min((cost/ (cost+1)) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                             <span className="w-20 text-right text-gray-400">Lucro</span>
                             <div className="flex-1 h-4 bg-gray-700 rounded overflow-hidden">
                                 <div className="h-full bg-blue-500" style={{ width: '30%' }}></div>
                             </div>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    )
}

const EventManager: React.FC<any> = ({ events, setEvents, company }) => (
    <div className="p-6 bg-gray-800 rounded-lg text-white">
        <h2 className="text-2xl font-bold text-orange-400 mb-4">Eventos</h2>
        <div className="space-y-4">
            {events.map((e: Event) => (
                <div key={e.id} className="p-4 bg-gray-700 rounded border-l-4 border-orange-500">
                    <h3 className="font-bold">{e.name}</h3>
                    <p className="text-sm text-gray-300">{new Date(e.startTime).toLocaleDateString()}</p>
                </div>
            ))}
            {events.length === 0 && <p className="text-gray-500">Nenhum evento registrado.</p>}
        </div>
    </div>
);

// --- MAIN APP COMPONENTS ---
const Dashboard: React.FC<{company: Company, onLogout: () => void}> = ({ company, onLogout }) => {
    const [tab, setTab] = useState('simulator');
    const [data, setData] = useState({ ingredients: [], drinks: [], events: [] });

    useEffect(() => {
        if(ENABLE_DATABASE) {
            Promise.all([
                api.ingredients.list(company.id),
                api.drinks.list(company.id),
                api.events.list(company.id)
            ]).then(([i, d, e]) => setData({ ingredients: i as any, drinks: d as any, events: e as any }));
        }
    }, []);

    return (
        <div className="min-h-screen bg-gray-900">
             <header className="bg-gray-800 p-4 flex justify-between items-center shadow-lg">
                 <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-orange-500"><LogoCD className="w-8 h-8" /></div>
                     <div>
                         <h1 className="font-bold text-white">CalculaDrink</h1>
                         <p className="text-xs text-gray-400">{company.name}</p>
                     </div>
                 </div>
                 <button onClick={onLogout} className="flex items-center gap-2 text-gray-400 hover:text-white"><LogOut size={18}/> Sair</button>
             </header>
             <main className="container mx-auto p-4">
                 <nav className="flex gap-2 mb-6 overflow-x-auto pb-2">
                     {['simulator', 'events', 'drinks', 'ingredients', 'stock'].map(t => (
                         <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded font-medium capitalize ${tab === t ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400'}`}>{t}</button>
                     ))}
                 </nav>
                 {tab === 'simulator' && <Simulator drinks={data.drinks} ingredients={data.ingredients} setEvents={setData} company={company} />}
                 {tab === 'ingredients' && <IngredientManager ingredients={data.ingredients} setIngredients={(i:any) => setData({...data, ingredients: i})} company={company} />}
                 {tab === 'stock' && <StockManager ingredients={data.ingredients} setIngredients={(i:any) => setData({...data, ingredients: i})} company={company} />}
                 {tab === 'drinks' && <DrinkManager drinks={data.drinks} setDrinks={(d:any) => setData({...data, drinks: d})} ingredients={data.ingredients} company={company} />}
                 {tab === 'events' && <EventManager events={data.events} setEvents={(e:any) => setData({...data, events: e})} company={company} />}
             </main>
        </div>
    );
};

const Auth: React.FC<{onLogin: (c: Company) => void}> = ({ onLogin }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [form, setForm] = useState({ email: '', password: '', document: '', name: '' });
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (mode === 'login') {
            const user = await api.auth.login(form.document, form.email, form.password);
            if (user) onLogin(user);
            else setError("Credenciais inválidas.");
        } else {
            const user = await api.auth.register({ 
                id: crypto.randomUUID(), 
                name: form.name, 
                email: form.email, 
                document: form.document, 
                createdAt: new Date().toISOString(),
                status: 'active',
                plan: null,
                nextBillingDate: null,
                role: 'admin',
                type: 'PJ',
                phone: '',
                responsibleName: form.name
            }, form.password);
            if (user) onLogin(user);
            else setError("Erro ao registrar.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md border border-gray-700">
                <div className="flex justify-center mb-6"><LogoCD className="w-20 h-20 text-orange-500" /></div>
                <h2 className="text-2xl font-bold text-center text-white mb-6">{mode === 'login' ? 'Acessar Painel' : 'Criar Conta'}</h2>
                {error && <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4 text-sm text-center">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'register' && <input type="text" placeholder="Nome da Empresa" className="w-full p-3 bg-gray-900 border border-gray-600 rounded text-white" onChange={e => setForm({...form, name: e.target.value})} />}
                    <input type="text" placeholder="CNPJ / CPF" className="w-full p-3 bg-gray-900 border border-gray-600 rounded text-white" onChange={e => setForm({...form, document: e.target.value})} />
                    <input type="email" placeholder="Email" className="w-full p-3 bg-gray-900 border border-gray-600 rounded text-white" onChange={e => setForm({...form, email: e.target.value})} />
                    <input type="password" placeholder="Senha" className="w-full p-3 bg-gray-900 border border-gray-600 rounded text-white" onChange={e => setForm({...form, password: e.target.value})} />
                    <button className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded transition">{mode === 'login' ? 'Entrar' : 'Cadastrar'}</button>
                </form>
                <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="w-full mt-4 text-gray-400 text-sm hover:text-white">
                    {mode === 'login' ? 'Não tem conta? Crie agora' : 'Já tem conta? Faça login'}
                </button>
            </div>
        </div>
    );
}

const App = () => {
    const [user, setUser] = useState<Company | null>(null);
    useEffect(() => {
        const saved = localStorage.getItem('session_user');
        if (saved) setUser(JSON.parse(saved));
    }, []);
    const login = (u: Company) => {
        setUser(u);
        localStorage.setItem('session_user', JSON.stringify(u));
    };
    const logout = () => {
        setUser(null);
        localStorage.removeItem('session_user');
    };
    return user ? <Dashboard company={user} onLogout={logout} /> : <Auth onLogin={login} />;
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
