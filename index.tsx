
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    Building2, ArrowRight, User, Briefcase, LogIn, Phone, Mail, 
    FileText, CheckCircle2, Loader2, Shield, Lock, Eye, EyeOff, 
    ArrowLeft, ShieldAlert, CheckCircle, Check, CreditCard, Star, LogOut,
    Plus, Trash2, Edit, Upload, FileSpreadsheet, HelpCircle, X, TrendingUp, 
    DollarSign, AlertCircle, Users, Target, BarChart2, Save, Clock, RotateCcw,
    Calendar, CheckSquare, PackagePlus, History, AlertTriangle, MinusCircle,
    LayoutDashboard, Unlock, KeyRound, RefreshCw, Copy, Filter, MoreHorizontal
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

// --- CONFIGURATIONS ---

const SUPABASE_URL = "https://hddckdbulgklubqvfsdi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZGNrZGJ1bGdrbHVicXZmc2RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NjMyNTcsImV4cCI6MjA3OTMzOTI1N30.QwlaVYETwcN91Nb1jlfXrZdkvhrUX0BfUL_x7bi1Dv4";
const ENABLE_DATABASE = true;
const MASTER_EMAIL = "contato@d2am.com";
const DEFAULT_PASSWORD = "123456";

// --- TYPES ---

export interface StockEntry {
  id: string;
  date: string;
  quantity: number;
  price: number;
  remainingQuantity: number;
}

export interface Ingredient {
  id:string;
  name: string;
  unit: 'ml' | 'l' | 'g' | 'kg' | 'un';
  isAlcoholic: boolean;
  stockEntries: StockEntry[];
  lowStockThreshold?: number;
}

export interface DrinkIngredient {
  ingredientId: string;
  quantity: number;
}

export interface Drink {
  id: string;
  name: string;
  ingredients: DrinkIngredient[];
  consumptionEstimate: {
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

export type CompanyStatus = 'pending_approval' | 'waiting_payment' | 'active' | 'suspended';
export type PlanType = 'monthly' | 'yearly' | null;
export type CompanyType = 'PF' | 'PJ';
export type UserRole = 'admin' | 'manager' | 'bartender';

export interface Company {
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

// --- LIB / SUPABASE ---

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
    try {
        errorMsg = JSON.stringify(error, null, 2);
    } catch (e) {
        errorMsg = String(error);
    }
    console.error(`Erro em ${context}:`, errorMsg);
    if (error?.code === 'PGRST205' || error?.code === '42P01' || error?.code === 'PGRST204') {
        console.group("🚨 BANCO DE DADOS NÃO CONFIGURADO 🚨");
        console.error("As tabelas ou colunas necessárias não foram encontradas no Supabase.");
        console.log("%c▼ COPIE O SCRIPT ABAIXO E RODE NO SQL EDITOR DO SUPABASE ▼", "color: orange; font-weight: bold; font-size: 12px;");
        console.log(SETUP_SQL);
        console.groupEnd();
        return true;
    }
    return false;
};

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
    login: async (document: string, email: string, password?: string): Promise<{company: Company, requiresPasswordChange: boolean} | null> => {
      try {
        const { data, error } = await supabase.from('companies').select('*').eq('document', document).ilike('email', email.trim()).maybeSingle(); 
        if (error) throw error;
        if (!data) return null;

        let requiresPasswordChange = false;
        if (data.password && password) {
            if (data.password !== password) {
                console.error("Senha incorreta.");
                return null;
            }
            if (data.password === DEFAULT_PASSWORD) requiresPasswordChange = true;
        } else if (!data.password && password === DEFAULT_PASSWORD) {
             // Old user without password using default
             requiresPasswordChange = true;
        } else if (!data.password) {
             // Old user, no password provided, allow login? No, force usage of default password.
             return null;
        }

        return { company: mapDatabaseToCompany(data), requiresPasswordChange };
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
    },
    changePassword: async (id: string, newPassword: string): Promise<boolean> => {
        const { error } = await supabase.from('companies').update({ password: newPassword }).eq('id', id);
        if (error) handleDatabaseError(error, 'Change Password');
        return !error;
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
              const { data: savedIng, error: ingError } = await supabase.from('ingredients').upsert({ id: id, company_id: companyId, name: ingData.name, unit: ingData.unit, is_alcoholic: ingData.isAlcoholic, low_stock_threshold: ingData.lowStockThreshold }).select().single();
              if (ingError || !savedIng) throw ingError;
              if (stockEntries && stockEntries.length > 0) {
                  const entriesPayload = stockEntries.map(entry => ({ id: entry.id, ingredient_id: savedIng.id, date: entry.date, quantity: entry.quantity, price: entry.price, remaining_quantity: entry.remainingQuantity }));
                  const { error: stockError } = await supabase.from('stock_entries').upsert(entriesPayload);
                  if (stockError) console.error('Erro ao salvar estoque:', stockError);
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
          return data.map((d: any) => ({ id: d.id, name: d.name, consumptionEstimate: { adults: d.adults_estimate, children: d.children_estimate }, ingredients: d.drink_ingredients.map((di: any) => ({ ingredientId: di.ingredient_id, quantity: di.quantity })) }));
      },
      save: async (companyId: string, drink: Drink): Promise<boolean> => {
          try {
              const { error: drinkError } = await supabase.from('drinks').upsert({ id: drink.id, company_id: companyId, name: drink.name, adults_estimate: drink.consumptionEstimate.adults, children_estimate: drink.consumptionEstimate.children });
              if (drinkError) throw drinkError;
              await supabase.from('drink_ingredients').delete().eq('drink_id', drink.id);
              if (drink.ingredients.length > 0) {
                  const { error: ingError } = await supabase.from('drink_ingredients').insert(drink.ingredients.map(di => ({ drink_id: drink.id, ingredient_id: di.ingredientId, quantity: di.quantity })));
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
          return data.map((e: any) => ({ id: e.id, name: e.name, startTime: e.start_time, endTime: e.end_time, status: e.status, numAdults: e.num_adults, numChildren: e.num_children, selectedDrinks: e.event_drinks.map((ed: any) => ed.drink_id), staff: e.event_staff.map((es: any) => ({ id: es.id, role: es.role, cost: es.cost })), simulatedCosts: e.simulated_final_price ? { finalPrice: e.simulated_final_price } : undefined }));
      },
      save: async (companyId: string, event: Event): Promise<boolean> => {
          try {
            const { error: eventError } = await supabase.from('events').upsert({ id: event.id, company_id: companyId, name: event.name, start_time: event.startTime, end_time: event.endTime, status: event.status, num_adults: event.numAdults, num_children: event.numChildren, simulated_final_price: event.simulatedCosts?.finalPrice });
            if (eventError) throw eventError;
            await supabase.from('event_drinks').delete().eq('event_id', event.id);
            if (event.selectedDrinks.length > 0) { await supabase.from('event_drinks').insert(event.selectedDrinks.map(drinkId => ({ event_id: event.id, drink_id: drinkId }))); }
            await supabase.from('event_staff').delete().eq('event_id', event.id);
            if (event.staff && event.staff.length > 0) { await supabase.from('event_staff').insert(event.staff.map(s => ({ event_id: event.id, role: s.role, cost: s.cost }))); }
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

// --- HOOKS ---

function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') { return initialValue; }
    try { const item = window.localStorage.getItem(key); return item ? JSON.parse(item) : initialValue; } catch (error) { console.error(error); return initialValue; }
  });
  useEffect(() => {
    try { const valueToStore = typeof storedValue === 'function' ? storedValue(storedValue) : storedValue; window.localStorage.setItem(key, JSON.stringify(valueToStore)); } catch (error) { console.error(error); }
  }, [key, storedValue]);
  return [storedValue, setStoredValue];
}

// --- UTILS ---

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

const ChangePasswordForce = ({ company, onPasswordChanged }: { company: Company, onPasswordChanged: () => void }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if(newPassword.length < 6) return alert("A senha deve ter no mínimo 6 caracteres");
        if(newPassword !== confirm) return alert("As senhas não conferem");
        
        setLoading(true);
        const success = await api.auth.changePassword(company.id, newPassword);
        if(success) {
            alert("Senha alterada com sucesso!");
            onPasswordChanged();
        } else {
            alert("Erro ao alterar senha");
        }
        setLoading(false);
    }

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 p-8 rounded-xl max-w-md w-full border border-orange-500">
                <div className="flex justify-center mb-4"><ShieldAlert className="text-orange-500" size={48}/></div>
                <h2 className="text-2xl font-bold text-white text-center mb-2">Alteração de Senha Obrigatória</h2>
                <p className="text-gray-400 text-center mb-6 text-sm">Por segurança, você deve alterar sua senha provisória antes de continuar.</p>
                <div className="space-y-4">
                    <input type="password" placeholder="Nova Senha" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full bg-gray-900 text-white p-3 rounded border border-gray-700" />
                    <input type="password" placeholder="Confirme a Senha" value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full bg-gray-900 text-white p-3 rounded border border-gray-700" />
                    <button onClick={handleSubmit} disabled={loading} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded transition-colors">{loading ? "Salvando..." : "Definir Nova Senha"}</button>
                </div>
            </div>
        </div>
    )
};

const IngredientManager: React.FC<{ ingredients: Ingredient[], setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>, company: Company }> = ({ ingredients, setIngredients, company }) => {
  const [newIngredient, setNewIngredient] = useLocalStorage<Omit<Ingredient, 'id' | 'stockEntries'>>(`${company.id}_ing_new`, { name: '', unit: 'ml', isAlcoholic: false, lowStockThreshold: 0 });
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading] = useState(false);

  const handleAddIngredient = async () => {
    if (newIngredient.name) {
       let updatedList = [...ingredients];
       if (isEditing) {
        const editedIngredient = { ...ingredients.find(i => i.id === isEditing)!, ...newIngredient };
        if (ENABLE_DATABASE) { await api.ingredients.save(company.id, editedIngredient); }
        updatedList = ingredients.map(ing => ing.id === isEditing ? editedIngredient : ing);
        setIsEditing(null);
      } else {
        const newItem: Ingredient = { ...newIngredient, id: crypto.randomUUID(), stockEntries: [] };
        if (ENABLE_DATABASE) { await api.ingredients.save(company.id, newItem); }
        updatedList = [...ingredients, newItem];
      }
      setIngredients(updatedList);
      setNewIngredient({ name: '', unit: 'ml', isAlcoholic: false, lowStockThreshold: 0 });
    }
  };

  const handleEdit = (ingredient: Ingredient) => {
    setIsEditing(ingredient.id);
    setNewIngredient({ name: ingredient.name, unit: ingredient.unit, isAlcoholic: ingredient.isAlcoholic, lowStockThreshold: ingredient.lowStockThreshold || 0 });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este insumo?")) {
        if (ENABLE_DATABASE) { await api.ingredients.delete(id); }
        setIngredients(ingredients.filter(ing => ing.id !== id));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: async (results) => {
        const importedIngredients: Ingredient[] = [];
        let successCount = 0;
        for (const row of results.data as any[]) {
            const name = row['Nome'] || row['nome'] || row['Name'];
            const unit = row['Unidade'] || row['unidade'] || row['Unit'];
            const isAlcoholicRaw = row['Alcoolico'] || row['alcoolico'] || row['Alcoholic'] || 'não';
            const thresholdRaw = row['Alerta'] || row['alerta'] || row['LowStock'] || '0';
            if (name && unit) {
                const newIng: Ingredient = { id: crypto.randomUUID(), name: name, unit: unit.toLowerCase(), isAlcoholic: String(isAlcoholicRaw).toLowerCase().includes('s') || String(isAlcoholicRaw).toLowerCase() === 'true', lowStockThreshold: parseFloat(thresholdRaw) || 0, stockEntries: [] };
                if (ENABLE_DATABASE) { await api.ingredients.save(company.id, newIng); }
                importedIngredients.push(newIng);
                successCount++;
            }
        }
        setIngredients(prev => [...prev, ...importedIngredients]);
        alert(`Importação concluída: ${successCount} insumos.`);
        setImportLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }});
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-6 bg-gray-800 rounded-lg shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-2xl font-bold text-orange-400">{isEditing ? 'Editar Insumo' : 'Adicionar Novo Insumo'}</h2>
            <div className="flex gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={importLoading} className="flex items-center gap-2 px-3 py-2 bg-green-700 text-white rounded-md hover:bg-green-600 text-sm">{importLoading ? <Loader2 className="animate-spin" size={16}/> : <Upload size={16} />} Importar CSV</button>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <input type="text" placeholder="Nome" value={newIngredient.name} onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })} className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2" />
          <select value={newIngredient.unit} onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value as Ingredient['unit'] })} className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2">
            <option value="ml">ml</option><option value="l">l</option><option value="g">g</option><option value="kg">kg</option><option value="un">un</option>
          </select>
          <input type="number" placeholder="Alerta Estoque" value={newIngredient.lowStockThreshold || ''} onChange={(e) => setNewIngredient({ ...newIngredient, lowStockThreshold: parseFloat(e.target.value) })} className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2" />
           <label className="flex items-center gap-2 cursor-pointer text-gray-300"><input type="checkbox" checked={newIngredient.isAlcoholic} onChange={(e) => setNewIngredient({ ...newIngredient, isAlcoholic: e.target.checked })} className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-orange-600" /> É Alcoólico?</label>
        </div>
        <div className="flex justify-end gap-3 mt-4">
            {isEditing && <button onClick={() => {setIsEditing(null); setNewIngredient({ name: '', unit: 'ml', isAlcoholic: false, lowStockThreshold: 0 });}} className="px-4 py-2 bg-gray-600 text-white rounded-md">Cancelar</button>}
            <button onClick={handleAddIngredient} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-500"><Plus size={18} /> {isEditing ? 'Salvar' : 'Adicionar'}</button>
        </div>
      </div>
      <div className="p-6 bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-orange-400">Lista de Insumos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b border-gray-700"><th className="p-3">Nome</th><th className="p-3">Unidade</th><th className="p-3">Alcoólico</th><th className="p-3">Alerta</th><th className="p-3">Ações</th></tr></thead>
            <tbody>
              {ingredients.map(ing => (
                  <tr key={ing.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="p-3">{ing.name}</td><td className="p-3">{ing.unit}</td><td className="p-3">{ing.isAlcoholic ? 'Sim' : 'Não'}</td><td className="p-3">{ing.lowStockThreshold || '-'}</td>
                    <td className="p-3"><div className="flex gap-2"><button onClick={() => handleEdit(ing)} className="text-blue-400"><Edit size={18} /></button><button onClick={() => handleDelete(ing.id)} className="text-red-400"><Trash2 size={18} /></button></div></td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StockManager: React.FC<{ ingredients: Ingredient[], setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>, company: Company }> = ({ ingredients, setIngredients, company }) => {
  const [addStockModal, setAddStockModal] = useState<Ingredient | null>(null);
  const [historyModal, setHistoryModal] = useState<Ingredient | null>(null);
  const [adjustStockModal, setAdjustStockModal] = useState<Ingredient | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [newEntry, setNewEntry] = useLocalStorage(`${company.id}_stock_new`, { date: new Date().toISOString().split('T')[0], quantity: 0, price: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddStockEntry = async () => {
    if (!addStockModal || newEntry.quantity <= 0 || newEntry.price <= 0) return;
    const newStockEntry: StockEntry = { id: crypto.randomUUID(), date: newEntry.date, quantity: newEntry.quantity, price: newEntry.price, remainingQuantity: newEntry.quantity };
    const targetIngredient = ingredients.find(i => i.id === addStockModal.id)!;
    const updatedIngredient: Ingredient = { ...targetIngredient, stockEntries: [...targetIngredient.stockEntries, newStockEntry] };
    setIngredients(prev => prev.map(ing => ing.id === updatedIngredient.id ? updatedIngredient : ing));
    if (ENABLE_DATABASE) { await api.ingredients.save(company.id, updatedIngredient); }
    setAddStockModal(null); setNewEntry({ date: new Date().toISOString().split('T')[0], quantity: 0, price: 0 });
  };

  const handleAdjustStock = async () => {
      if (!adjustStockModal || adjustmentAmount <= 0) return;
      const targetIngredient = JSON.parse(JSON.stringify(ingredients.find(i => i.id === adjustStockModal.id)!)) as Ingredient;
      let qtyToRemove = adjustmentAmount;
      targetIngredient.stockEntries.sort((a:any,b:any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      for (const entry of targetIngredient.stockEntries) {
          if (qtyToRemove <= 0) break;
          const deduct = Math.min(qtyToRemove, entry.remainingQuantity);
          entry.remainingQuantity -= deduct;
          qtyToRemove -= deduct;
      }
      setIngredients(prev => prev.map(ing => ing.id === targetIngredient.id ? targetIngredient : ing));
      if (ENABLE_DATABASE) { await api.ingredients.save(company.id, targetIngredient); }
      setAdjustStockModal(null); setAdjustmentAmount(0);
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if(!file) return;
      Papa.parse(file, { header: true, skipEmptyLines: true, complete: async (results) => {
          let count = 0;
          const updatedMap = new Map(ingredients.map(i => [i.name.toLowerCase(), {...i}]));
          for (const row of results.data as any[]) {
              const name = row['Insumo'] || row['insumo'];
              const qty = parseFloat(row['Quantidade'] || row['quantidade']);
              const price = parseFloat(row['Preco'] || row['preco']);
              if(name && qty && price) {
                  const ing = updatedMap.get(name.toLowerCase());
                  if(ing) {
                      ing.stockEntries.push({ id: crypto.randomUUID(), date: new Date().toISOString().split('T')[0], quantity: qty, price: price, remainingQuantity: qty });
                      updatedMap.set(name.toLowerCase(), ing);
                      count++;
                  }
              }
          }
          const newList = Array.from(updatedMap.values());
          setIngredients(newList);
          if(ENABLE_DATABASE) { for(const ing of newList) await api.ingredients.save(company.id, ing); }
          alert(`Importação concluída: ${count} entradas.`);
          if(fileInputRef.current) fileInputRef.current.value = '';
      }});
  };

  const calculateStockInfo = (ingredient: Ingredient) => {
    const totalStock = ingredient.stockEntries.reduce((sum, entry) => sum + entry.remainingQuantity, 0);
    const totalValue = ingredient.stockEntries.reduce((sum, entry) => sum + (entry.quantity > 0 ? entry.price / entry.quantity : 0) * entry.remainingQuantity, 0);
    return { totalStock, avgCost: totalStock > 0 ? totalValue / totalStock : 0, totalValue };
  };

  const filtered = ingredients.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      {addStockModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl font-bold text-orange-400">Entrada: {addStockModal.name}</h3>
            <input type="date" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} className="w-full bg-gray-700 text-white p-2 rounded" />
            <input type="number" placeholder="Quantidade" value={newEntry.quantity||''} onChange={e => setNewEntry({...newEntry, quantity: parseFloat(e.target.value)})} className="w-full bg-gray-700 text-white p-2 rounded" />
            <input type="number" placeholder="Preço Total" value={newEntry.price||''} onChange={e => setNewEntry({...newEntry, price: parseFloat(e.target.value)})} className="w-full bg-gray-700 text-white p-2 rounded" />
            <div className="flex justify-end gap-2"><button onClick={()=>setAddStockModal(null)} className="px-4 py-2 bg-gray-600 rounded">Cancelar</button><button onClick={handleAddStockEntry} className="px-4 py-2 bg-orange-600 rounded">Adicionar</button></div>
          </div>
        </div>
      )}
      {adjustStockModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4">
                <h3 className="text-xl font-bold text-orange-400">Ajustar: {adjustStockModal.name}</h3>
                <p className="text-gray-400">Estoque atual: {calculateStockInfo(adjustStockModal).totalStock} {adjustStockModal.unit}</p>
                <input type="number" placeholder="Qtd a remover" value={adjustmentAmount||''} onChange={e => setAdjustmentAmount(parseFloat(e.target.value))} className="w-full bg-gray-700 text-white p-2 rounded" />
                <div className="flex justify-end gap-2"><button onClick={()=>setAdjustStockModal(null)} className="px-4 py-2 bg-gray-600 rounded">Cancelar</button><button onClick={handleAdjustStock} className="px-4 py-2 bg-red-600 rounded">Confirmar</button></div>
            </div>
          </div>
      )}
      <div className="p-6 bg-gray-800 rounded-lg shadow-md">
        <div className="flex justify-between mb-4 items-center gap-4">
            <h2 className="text-2xl font-bold text-orange-400">Estoque</h2>
            <div className="flex gap-2">
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="bg-gray-700 text-white p-2 rounded" />
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-green-700 text-white rounded-md text-sm"><Upload size={16} /> CSV</button>
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b border-gray-700"><th className="p-3">Insumo</th><th className="p-3">Estoque</th><th className="p-3">Custo Médio</th><th className="p-3">Ações</th></tr></thead>
            <tbody>
              {filtered.map(ing => {
                const info = calculateStockInfo(ing);
                return (
                  <tr key={ing.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="p-3">{ing.name} {ing.lowStockThreshold && info.totalStock < ing.lowStockThreshold && <AlertTriangle size={16} className="inline text-red-500"/>}</td>
                    <td className="p-3">{info.totalStock.toFixed(2)} {ing.unit}</td>
                    <td className="p-3">R$ {info.avgCost.toFixed(2)}</td>
                    <td className="p-3 flex gap-2">
                        <button onClick={()=>setAddStockModal(ing)} className="text-green-400"><PackagePlus size={18}/></button>
                        <button onClick={()=>setAdjustStockModal(ing)} className="text-yellow-400"><MinusCircle size={18}/></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const DrinkManager: React.FC<{ drinks: Drink[], setDrinks: React.Dispatch<React.SetStateAction<Drink[]>>, ingredients: Ingredient[], company: Company }> = ({ drinks, setDrinks, ingredients, company }) => {
  const [isModalOpen, setIsModalOpen] = useLocalStorage(`${company.id}_drink_modal`, false);
  const [drinkName, setDrinkName] = useLocalStorage(`${company.id}_drink_name`, '');
  const [recipe, setRecipe] = useLocalStorage<DrinkIngredient[]>(`${company.id}_drink_recipe`, []);
  const [consumption, setConsumption] = useLocalStorage(`${company.id}_drink_est`, { adults: 0.5, children: 0 });
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateCost = (drink: Drink) => {
      return drink.ingredients.reduce((total, item) => {
          const ing = ingredients.find(i => i.id === item.ingredientId);
          if(!ing) return total;
          const totalStock = ing.stockEntries.reduce((s, e) => s + e.remainingQuantity, 0);
          const totalVal = ing.stockEntries.reduce((s, e) => s + (e.quantity > 0 ? e.price/e.quantity : 0) * e.remainingQuantity, 0);
          const avg = totalStock > 0 ? totalVal / totalStock : 0;
          return total + avg * item.quantity;
      }, 0);
  };

  const handleSave = async () => {
      if(!drinkName) return;
      const newDrink: Drink = { id: editingDrink ? editingDrink.id : crypto.randomUUID(), name: drinkName, ingredients: recipe.filter(r=>r.quantity > 0), consumptionEstimate: consumption };
      const updatedList = editingDrink ? drinks.map(d => d.id === editingDrink.id ? newDrink : d) : [...drinks, newDrink];
      setDrinks(updatedList);
      if(ENABLE_DATABASE) await api.drinks.save(company.id, newDrink);
      setIsModalOpen(false); setEditingDrink(null); setDrinkName(''); setRecipe([]);
  };

  const handleDelete = async (id: string) => {
      if(confirm("Excluir drink?")) {
          setDrinks(drinks.filter(d => d.id !== id));
          if(ENABLE_DATABASE) await api.drinks.delete(id);
      }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if(!file) return;
      Papa.parse(file, { header: true, skipEmptyLines: true, complete: async (results) => {
          const drinkMap = new Map<string, Drink>();
          const ingMap = new Map(ingredients.map(i => [i.name.toLowerCase(), i.id]));
          for (const row of results.data as any[]) {
              const dName = row['Drink'] || row['drink'];
              const iName = row['Insumo'] || row['insumo'];
              const qty = parseFloat(row['Quantidade'] || row['quantidade']);
              if(dName && iName && qty) {
                  const iId = ingMap.get(iName.toLowerCase());
                  if(iId) {
                      if(!drinkMap.has(dName)) drinkMap.set(dName, { id: crypto.randomUUID(), name: dName, ingredients: [], consumptionEstimate: { adults: 0.5, children: 0 } });
                      drinkMap.get(dName)?.ingredients.push({ ingredientId: iId, quantity: qty });
                  }
              }
          }
          const newDrinks = Array.from(drinkMap.values());
          setDrinks(prev => [...prev, ...newDrinks]);
          if(ENABLE_DATABASE) { for(const d of newDrinks) await api.drinks.save(company.id, d); }
          alert(`Importados ${newDrinks.length} drinks.`);
          if(fileInputRef.current) fileInputRef.current.value = '';
      }});
  }

  return (
      <div className="space-y-6 animate-fade-in">
          <div className="flex justify-end gap-2">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-green-700 text-white rounded-md text-sm"><Upload size={16} /> Importar</button>
              <button onClick={() => { setEditingDrink(null); setDrinkName(''); setRecipe([]); setIsModalOpen(true); }} className="px-4 py-2 bg-orange-600 text-white rounded flex items-center gap-2"><Plus size={18}/> Novo Drink</button>
          </div>
          {isModalOpen && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                  <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
                      <h3 className="text-xl font-bold text-orange-400">{editingDrink ? 'Editar' : 'Novo'} Drink</h3>
                      <input placeholder="Nome" value={drinkName} onChange={e=>setDrinkName(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded"/>
                      <div className="flex gap-4">
                          <input type="number" placeholder="Adultos/h" value={consumption.adults} onChange={e=>setConsumption({...consumption, adults: parseFloat(e.target.value)})} className="w-full bg-gray-700 text-white p-2 rounded"/>
                          <input type="number" placeholder="Crianças/h" value={consumption.children} onChange={e=>setConsumption({...consumption, children: parseFloat(e.target.value)})} className="w-full bg-gray-700 text-white p-2 rounded"/>
                      </div>
                      <div className="space-y-2">
                          <h4 className="font-bold text-gray-300">Receita</h4>
                          {recipe.map((r, idx) => (
                              <div key={idx} className="flex gap-2">
                                  <select value={r.ingredientId} onChange={e=>{const n=[...recipe]; n[idx].ingredientId=e.target.value; setRecipe(n);}} className="flex-1 bg-gray-600 text-white p-2 rounded">
                                      {ingredients.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
                                  </select>
                                  <input type="number" value={r.quantity} onChange={e=>{const n=[...recipe]; n[idx].quantity=parseFloat(e.target.value); setRecipe(n);}} className="w-20 bg-gray-600 text-white p-2 rounded" />
                                  <button onClick={()=>setRecipe(recipe.filter((_,i)=>i!==idx))} className="text-red-400"><Trash2 size={18}/></button>
                              </div>
                          ))}
                          <button onClick={()=>{if(ingredients.length) setRecipe([...recipe, {ingredientId: ingredients[0].id, quantity:0}])}} className="text-sm text-orange-400 flex items-center gap-1"><Plus size={14}/> Add Insumo</button>
                      </div>
                      <div className="flex justify-end gap-2"><button onClick={()=>setIsModalOpen(false)} className="px-4 py-2 bg-gray-600 rounded">Cancelar</button><button onClick={handleSave} className="px-4 py-2 bg-orange-600 rounded">Salvar</button></div>
                  </div>
              </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
              {drinks.map(d => (
                  <div key={d.id} className="bg-gray-800 p-4 rounded-lg shadow flex justify-between">
                      <div>
                          <h3 className="font-bold text-lg text-white">{d.name}</h3>
                          <p className="text-green-400 text-sm font-mono">Custo Base: R$ {calculateCost(d).toFixed(2)}</p>
                          <ul className="text-xs text-gray-400 mt-2 list-disc pl-4">{d.ingredients.map((di, i) => <li key={i}>{di.quantity} {ingredients.find(ing=>ing.id===di.ingredientId)?.unit} de {ingredients.find(ing=>ing.id===di.ingredientId)?.name}</li>)}</ul>
                      </div>
                      <div className="flex flex-col gap-2">
                          <button onClick={()=>{setEditingDrink(d); setDrinkName(d.name); setRecipe(d.ingredients); setConsumption(d.consumptionEstimate); setIsModalOpen(true);}} className="text-blue-400"><Edit size={18}/></button>
                          <button onClick={()=>handleDelete(d.id)} className="text-red-400"><Trash2 size={18}/></button>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  )
};

const Simulator: React.FC<{ drinks: Drink[], ingredients: Ingredient[], setEvents: any, company: Company }> = ({ drinks, ingredients, setEvents, company }) => {
  const [selectedDrinks, setSelectedDrinks] = useLocalStorage(`${company.id}_sim_selected`, []);
  const [numAdults, setNumAdults] = useLocalStorage(`${company.id}_sim_adults`, 40);
  const [numChildren, setNumChildren] = useLocalStorage(`${company.id}_sim_children`, 10);
  const [duration, setDuration] = useLocalStorage(`${company.id}_sim_duration`, 4);
  const [staff, setStaff] = useLocalStorage<StaffMember[]>(`${company.id}_sim_staff`, []);
  const [margin, setMargin] = useLocalStorage(`${company.id}_sim_margin`, 100);
  const [newStaff, setNewStaff] = useState({ role: '', cost: 0 });
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [newEventDetails, setNewEventDetails] = useState({ name: '', start: '', end: '' });

  const costs = useMemo(() => {
      let ingCost = 0;
      for (const dId of selectedDrinks) {
          const d = drinks.find(dk => dk.id === dId);
          if(d) {
             const servings = (numAdults * duration * d.consumptionEstimate.adults) + (d.ingredients.some(i=>ingredients.find(ing=>ing.id===i.ingredientId)?.isAlcoholic) ? 0 : numChildren * duration * d.consumptionEstimate.children);
             for(const di of d.ingredients) {
                 const ing = ingredients.find(i=>i.id===di.ingredientId);
                 if(ing) {
                     const totalStock = ing.stockEntries.reduce((s,e)=>s+e.remainingQuantity,0);
                     const totalVal = ing.stockEntries.reduce((s,e)=>s+(e.quantity>0?e.price/e.quantity:0)*e.remainingQuantity,0);
                     const avg = totalStock>0?totalVal/totalStock:0;
                     ingCost += avg * di.quantity * servings;
                 }
             }
          }
      }
      const opCost = staff.reduce((s,m) => s + m.cost, 0);
      return { ingredientCost: ingCost, operationalCost: opCost, totalCost: ingCost + opCost, profit: ingCost * (margin/100), finalPrice: ingCost + opCost + (ingCost * (margin/100)) };
  }, [selectedDrinks, numAdults, numChildren, duration, staff, margin, drinks, ingredients]);

  const handleSaveEvent = async () => {
      if(!newEventDetails.name) return;
      const evt: Event = {
          id: crypto.randomUUID(),
          name: newEventDetails.name,
          startTime: new Date(newEventDetails.start).toISOString(),
          endTime: new Date(newEventDetails.end).toISOString(),
          status: 'planned',
          numAdults, numChildren,
          selectedDrinks,
          staff,
          simulatedCosts: costs
      };
      setEvents((prev: Event[]) => [...prev, evt]);
      if(ENABLE_DATABASE) await api.events.save(company.id, evt);
      setIsSaveOpen(false);
  };

  return (
      <div className="space-y-6 animate-fade-in">
          <div className="flex justify-end"><button onClick={() => {setSelectedDrinks([]); setNumAdults(40); setNumChildren(10); setStaff([]);}} className="text-gray-400 flex items-center gap-2"><RotateCcw size={16}/> Limpar</button></div>
          <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                  <div className="bg-gray-800 p-4 rounded-lg">
                      <h3 className="text-orange-400 font-bold mb-2">1. Drinks</h3>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                          {drinks.map(d => (
                              <label key={d.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-700 p-2 rounded">
                                  <input type="checkbox" checked={selectedDrinks.includes(d.id)} onChange={()=>setSelectedDrinks(prev=>prev.includes(d.id)?prev.filter(x=>x!==d.id):[...prev, d.id])} className="rounded bg-gray-700 text-orange-600"/>
                                  <span className="text-white text-sm">{d.name}</span>
                              </label>
                          ))}
                      </div>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg space-y-4">
                      <h3 className="text-orange-400 font-bold">2. Detalhes</h3>
                      <div><label>Adultos: {numAdults}</label><input type="range" min="0" max="500" value={numAdults} onChange={e=>setNumAdults(Number(e.target.value))} className="w-full"/></div>
                      <div><label>Crianças: {numChildren}</label><input type="range" min="0" max="200" value={numChildren} onChange={e=>setNumChildren(Number(e.target.value))} className="w-full"/></div>
                      <div><label>Duração: {duration}h</label><input type="range" min="1" max="12" value={duration} onChange={e=>setDuration(Number(e.target.value))} className="w-full"/></div>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg">
                      <h3 className="text-orange-400 font-bold mb-2">3. Equipe</h3>
                      <div className="flex gap-2 mb-2"><input placeholder="Função" value={newStaff.role} onChange={e=>setNewStaff({...newStaff, role: e.target.value})} className="w-full bg-gray-700 text-white p-1 rounded"/><input type="number" placeholder="R$" value={newStaff.cost||''} onChange={e=>setNewStaff({...newStaff, cost: parseFloat(e.target.value)})} className="w-20 bg-gray-700 text-white p-1 rounded"/><button onClick={()=>{if(newStaff.role) setStaff([...staff, {...newStaff, id: crypto.randomUUID()}])}} className="bg-orange-600 px-2 rounded"><Plus/></button></div>
                      {staff.map(s=><div key={s.id} className="flex justify-between text-sm text-gray-300"><span>{s.role}</span><span>R$ {s.cost} <button onClick={()=>setStaff(staff.filter(x=>x.id!==s.id))}><Trash2 size={12}/></button></span></div>)}
                  </div>
              </div>
              <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg space-y-6">
                  <div className="flex justify-between">
                      <h2 className="text-2xl font-bold text-orange-400">Resultado</h2>
                      <button onClick={()=>setIsSaveOpen(true)} disabled={!selectedDrinks.length} className="bg-blue-600 px-4 py-2 rounded text-white flex items-center gap-2 disabled:opacity-50"><Save size={18}/> Salvar Evento</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-gray-700 p-4 rounded"><p className="text-gray-400">Custo Total</p><p className="text-2xl font-bold">R$ {costs.totalCost.toFixed(2)}</p></div>
                      <div className="bg-orange-900/50 border border-orange-500 p-4 rounded"><p className="text-orange-300">Valor Final</p><p className="text-3xl font-bold text-orange-400">R$ {costs.finalPrice.toFixed(2)}</p></div>
                  </div>
                  <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[{name: 'Insumos', value: costs.ingredientCost}, {name: 'Equipe', value: costs.operationalCost}, {name: 'Lucro', value: costs.profit}]} layout="vertical"><XAxis type="number"/><YAxis type="category" dataKey="name" width={80}/><Tooltip contentStyle={{backgroundColor: '#333'}}/><Bar dataKey="value" fill="#f97316" barSize={30}/></BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>
          {isSaveOpen && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                  <div className="bg-gray-800 p-6 rounded w-96 space-y-4">
                      <h3 className="font-bold text-white">Salvar Evento</h3>
                      <input placeholder="Nome" value={newEventDetails.name} onChange={e=>setNewEventDetails({...newEventDetails, name: e.target.value})} className="w-full bg-gray-700 text-white p-2 rounded"/>
                      <input type="datetime-local" value={newEventDetails.start} onChange={e=>setNewEventDetails({...newEventDetails, start: e.target.value})} className="w-full bg-gray-700 text-white p-2 rounded"/>
                      <input type="datetime-local" value={newEventDetails.end} onChange={e=>setNewEventDetails({...newEventDetails, end: e.target.value})} className="w-full bg-gray-700 text-white p-2 rounded"/>
                      <div className="flex justify-end gap-2"><button onClick={()=>setIsSaveOpen(false)} className="px-4 py-2 bg-gray-600 rounded">Cancelar</button><button onClick={handleSaveEvent} className="px-4 py-2 bg-orange-600 rounded">Salvar</button></div>
                  </div>
              </div>
          )}
      </div>
  )
};

const EventManager: React.FC<{ events: Event[], setEvents: any, drinks: Drink[], ingredients: Ingredient[], setIngredients: any, company: Company }> = ({ events, setEvents, drinks, ingredients, setIngredients, company }) => {
  const handleGeneratePDF = (event: Event) => {
      const fullDrinks = event.selectedDrinks.map(id => drinks.find(d => d.id === id)).filter((d): d is Drink => !!d);
      generateProposalPDF(event, company, fullDrinks, event.staff || []);
  };

  const handleDelete = async (id: string) => {
      if(confirm("Excluir?")) { setEvents(events.filter(e => e.id !== id)); if(ENABLE_DATABASE) await api.events.delete(id); }
  }

  return (
      <div className="space-y-6 animate-fade-in">
          <h2 className="text-2xl font-bold text-orange-400">Eventos</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map(evt => (
                  <div key={evt.id} className="bg-gray-800 p-4 rounded shadow space-y-2">
                      <div className="flex justify-between"><h3 className="font-bold text-white">{evt.name}</h3><span className={`text-xs px-2 py-1 rounded ${evt.status==='completed'?'bg-green-500':'bg-blue-500'}`}>{evt.status}</span></div>
                      <p className="text-sm text-gray-400">{new Date(evt.startTime).toLocaleDateString()} - {evt.numAdults} convidados</p>
                      <p className="font-bold text-orange-400">R$ {evt.simulatedCosts?.finalPrice.toFixed(2)}</p>
                      <div className="flex justify-end gap-2 mt-4">
                          <button onClick={()=>handleGeneratePDF(evt)} className="text-blue-400 text-xs border border-blue-500 p-1 rounded flex gap-1"><FileText size={12}/> PDF</button>
                          <button onClick={()=>handleDelete(evt.id)} className="text-red-400 text-xs border border-red-500 p-1 rounded"><Trash2 size={12}/></button>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  )
};

// --- MAIN LAYOUT COMPONENTS ---

const Auth: React.FC<{ onLogin: (company: Company, requiresChange: boolean) => void }> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'recovery'>('login');
  const [loginData, setLoginData] = useState({ document: '', email: '', password: '' });
  const [regData, setRegData] = useState({ name: '', document: '', email: '', password: '', confirm: '', phone: '', responsible: '', role: 'admin' as UserRole, type: 'PJ' as CompanyType });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault(); setError(null); setLoading(true);
      const res = await api.auth.login(loginData.document, loginData.email, loginData.password);
      if (res) onLogin(res.company, res.requiresPasswordChange);
      else setError("Empresa não encontrada ou senha incorreta.");
      setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault(); setError(null);
      if(regData.password !== regData.confirm) return setError("Senhas não conferem");
      setLoading(true);
      const comp: Company = { id: crypto.randomUUID(), name: regData.name, createdAt: new Date().toISOString(), status: 'pending_approval', plan: null, nextBillingDate: null, role: regData.role, type: regData.type, document: regData.document, email: regData.email, phone: regData.phone, responsibleName: regData.responsible };
      const res = await api.auth.register(comp, regData.password);
      if(res) { setSuccess("Cadastro realizado! Faça login."); setActiveTab('login'); }
      else setError("Erro ao cadastrar. Verifique duplicidade.");
      setLoading(false);
  };

  return (
      <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-xl flex flex-col md:flex-row w-full max-w-4xl overflow-hidden border border-gray-700">
              <div className="bg-gradient-to-br from-orange-700 to-orange-600 p-10 md:w-2/5 text-white flex flex-col justify-center items-center text-center">
                  <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-4"><LogoCD className="w-full h-full text-white"/></div>
                  <h1 className="text-3xl font-bold mb-2">CalculaDrink</h1>
                  <p className="text-orange-100">Gestão inteligente para seu bar.</p>
              </div>
              <div className="p-8 md:w-3/5">
                  {error && <div className="bg-red-900/20 border border-red-500 text-red-200 p-3 rounded mb-4 flex gap-2"><ShieldAlert size={18}/> {error}</div>}
                  {success && <div className="bg-green-900/20 border border-green-500 text-green-200 p-3 rounded mb-4 flex gap-2"><CheckCircle size={18}/> {success}</div>}
                  
                  <div className="flex mb-6 bg-gray-700/30 p-1 rounded">
                      <button onClick={()=>setActiveTab('login')} className={`flex-1 py-2 rounded ${activeTab==='login'?'bg-gray-700 text-white':'text-gray-400'}`}>Entrar</button>
                      <button onClick={()=>setActiveTab('register')} className={`flex-1 py-2 rounded ${activeTab==='register'?'bg-gray-700 text-white':'text-gray-400'}`}>Cadastrar</button>
                  </div>

                  {activeTab === 'login' && (
                      <form onSubmit={handleLogin} className="space-y-4">
                          <input placeholder="CNPJ/CPF" value={loginData.document} onChange={e=>setLoginData({...loginData, document: e.target.value})} className="w-full bg-gray-900 text-white p-3 rounded border border-gray-700" />
                          <input type="email" placeholder="Email" value={loginData.email} onChange={e=>setLoginData({...loginData, email: e.target.value})} className="w-full bg-gray-900 text-white p-3 rounded border border-gray-700" />
                          <input type="password" placeholder="Senha" value={loginData.password} onChange={e=>setLoginData({...loginData, password: e.target.value})} className="w-full bg-gray-900 text-white p-3 rounded border border-gray-700" />
                          <button disabled={loading} className="w-full bg-orange-600 text-white py-3 rounded font-bold">{loading ? <Loader2 className="animate-spin mx-auto"/> : "Acessar Painel"}</button>
                      </form>
                  )}

                  {activeTab === 'register' && (
                      <form onSubmit={handleRegister} className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                          <div className="flex gap-2">
                              <label className={`flex-1 p-2 border rounded cursor-pointer ${regData.type==='PJ'?'border-orange-500 bg-orange-500/10':'border-gray-600'}`}><input type="radio" className="hidden" onClick={()=>setRegData({...regData, type: 'PJ'})}/> PJ</label>
                              <label className={`flex-1 p-2 border rounded cursor-pointer ${regData.type==='PF'?'border-orange-500 bg-orange-500/10':'border-gray-600'}`}><input type="radio" className="hidden" onClick={()=>setRegData({...regData, type: 'PF'})}/> PF</label>
                          </div>
                          <input placeholder="Nome Fantasia / Profissional" value={regData.name} onChange={e=>setRegData({...regData, name: e.target.value})} className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700" />
                          <input placeholder="Documento" value={regData.document} onChange={e=>setRegData({...regData, document: e.target.value})} className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700" />
                          <input placeholder="Responsável" value={regData.responsible} onChange={e=>setRegData({...regData, responsible: e.target.value})} className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700" />
                          <input type="email" placeholder="Email" value={regData.email} onChange={e=>setRegData({...regData, email: e.target.value})} className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700" />
                          <input type="tel" placeholder="Telefone" value={regData.phone} onChange={e=>setRegData({...regData, phone: e.target.value})} className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700" />
                          <div className="flex gap-2">
                            <input type="password" placeholder="Senha" value={regData.password} onChange={e=>setRegData({...regData, password: e.target.value})} className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700" />
                            <input type="password" placeholder="Confirmar" value={regData.confirm} onChange={e=>setRegData({...regData, confirm: e.target.value})} className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700" />
                          </div>
                          <button disabled={loading} className="w-full bg-orange-600 text-white py-3 rounded font-bold">Criar Conta</button>
                      </form>
                  )}
              </div>
          </div>
      </div>
  )
}

const Dashboard: React.FC<{ company: Company, onLogout: () => void, isMasterAdmin?: boolean, onSwitchToAdmin?: () => void }> = ({ company, onLogout, isMasterAdmin, onSwitchToAdmin }) => {
    const [activeTab, setActiveTab] = useLocalStorage('active_tab', 'simulator');
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [drinks, setDrinks] = useState<Drink[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if(ENABLE_DATABASE) {
            setLoading(true);
            Promise.all([api.ingredients.list(company.id), api.drinks.list(company.id), api.events.list(company.id)])
            .then(([i, d, e]) => { setIngredients(i); setDrinks(d); setEvents(e); })
            .finally(() => setLoading(false));
        }
    }, [company.id]);

    return (
        <div className="min-h-screen bg-gray-900 font-sans">
            <header className="bg-gray-800 shadow-lg border-b border-gray-700">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 text-orange-600 bg-white/10 rounded-full p-0.5"><LogoCD className="w-full h-full"/></div>
                        <div><h1 className="text-xl font-bold text-white">CalculaDrink</h1><p className="text-xs text-gray-400">{company.name}</p></div>
                    </div>
                    <div className="flex items-center gap-4">
                        {isMasterAdmin && <button onClick={onSwitchToAdmin} className="text-orange-400 border border-orange-500 px-3 py-1 rounded text-sm">Admin</button>}
                        <button onClick={onLogout} className="text-gray-400 hover:text-white"><LogOut size={20}/></button>
                    </div>
                </div>
            </header>
            <main className="container mx-auto p-4">
                {loading ? <div className="text-center py-10 text-orange-500"><Loader2 className="animate-spin inline" size={40}/></div> : (
                    <>
                        <nav className="flex gap-2 overflow-x-auto mb-6 border-b border-gray-700 pb-1">
                            {['simulator', 'events', 'drinks', 'ingredients', 'stock'].map(tab => (
                                <button key={tab} onClick={()=>setActiveTab(tab)} className={`px-4 py-2 capitalize ${activeTab===tab?'text-orange-400 border-b-2 border-orange-400':'text-gray-400'}`}>{tab}</button>
                            ))}
                        </nav>
                        {activeTab === 'ingredients' && <IngredientManager ingredients={ingredients} setIngredients={setIngredients} company={company} />}
                        {activeTab === 'stock' && <StockManager ingredients={ingredients} setIngredients={setIngredients} company={company} />}
                        {activeTab === 'drinks' && <DrinkManager drinks={drinks} setDrinks={setDrinks} ingredients={ingredients} company={company} />}
                        {activeTab === 'simulator' && <Simulator drinks={drinks} ingredients={ingredients} setEvents={setEvents} company={company} />}
                        {activeTab === 'events' && <EventManager events={events} setEvents={setEvents} drinks={drinks} ingredients={ingredients} setIngredients={setIngredients} company={company} />}
                    </>
                )}
            </main>
        </div>
    )
}

const MasterDashboard: React.FC<{ adminUser: Company, onLogout: () => void, onSwitchToApp: () => void }> = ({ onLogout, onSwitchToApp }) => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => { api.admin.listAllCompanies().then(c => { setCompanies(c); setLoading(false); }); }, []);
    
    const toggleStatus = async (c: Company) => {
        const newStatus = c.status === 'active' ? 'suspended' : 'active';
        if(confirm(`Alterar status para ${newStatus}?`)) {
            await api.admin.updateCompanyStatus(c.id, newStatus);
            setCompanies(prev => prev.map(x => x.id === c.id ? {...x, status: newStatus} : x));
        }
    }
    
    const resetPass = async (c: Company) => {
        const newPass = Math.random().toString(36).slice(-8).toUpperCase();
        if(confirm(`Resetar senha para ${newPass}?`)) {
            await api.admin.resetUserPassword(c.id, newPass);
            alert(`Senha alterada para: ${newPass}`);
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Master Admin</h1>
                <div className="flex gap-4"><button onClick={onSwitchToApp} className="bg-orange-600 text-white px-4 py-2 rounded">Acessar App</button><button onClick={onLogout} className="text-gray-400">Sair</button></div>
            </header>
            {loading ? <Loader2 className="animate-spin text-orange-500 mx-auto"/> : (
                <div className="bg-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-white">
                        <thead className="bg-gray-700 text-gray-300"><tr><th className="p-4">Empresa</th><th className="p-4">Email</th><th className="p-4">Status</th><th className="p-4">Ações</th></tr></thead>
                        <tbody>
                            {companies.map(c => (
                                <tr key={c.id} className="border-b border-gray-700">
                                    <td className="p-4 font-bold">{c.name}</td>
                                    <td className="p-4">{c.email}</td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${c.status==='active'?'bg-green-900 text-green-400':'bg-red-900 text-red-400'}`}>{c.status}</span></td>
                                    <td className="p-4 flex gap-2">
                                        <button onClick={()=>toggleStatus(c)} className="text-blue-400 border border-blue-500 p-1 rounded">Status</button>
                                        <button onClick={()=>resetPass(c)} className="text-yellow-400 border border-yellow-500 p-1 rounded"><KeyRound size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

// --- APP ROOT ---

const App: React.FC = () => {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(() => {
    const saved = localStorage.getItem('session'); return saved ? JSON.parse(saved) : null;
  });
  const [forceChangePass, setForceChangePass] = useState(false);
  const [masterView, setMasterView] = useState<'admin' | 'app'>('admin');

  const handleLogin = (company: Company, requiresChange: boolean) => {
      setCurrentCompany(company);
      setForceChangePass(requiresChange);
      localStorage.setItem('session', JSON.stringify(company));
  };

  const handleLogout = () => {
      setCurrentCompany(null);
      localStorage.removeItem('session');
      setMasterView('admin');
  }

  if (!currentCompany) return <Auth onLogin={handleLogin} />;
  if (forceChangePass) return <ChangePasswordForce company={currentCompany} onPasswordChanged={()=>setForceChangePass(false)} />;

  const isMaster = currentCompany.email === MASTER_EMAIL;
  if (isMaster && masterView === 'admin') return <MasterDashboard adminUser={currentCompany} onLogout={handleLogout} onSwitchToApp={()=>setMasterView('app')} />;

  if (!isMaster && currentCompany.status === 'pending_approval') return <div className="h-screen flex items-center justify-center text-white bg-gray-900">Cadastro em análise... <button onClick={handleLogout} className="ml-4 text-orange-500 underline">Sair</button></div>;
  if (!isMaster && currentCompany.status === 'suspended') return <div className="h-screen flex items-center justify-center text-white bg-gray-900">Conta Suspensa/Pagamento Pendente. <button onClick={handleLogout} className="ml-4 text-orange-500 underline">Sair</button></div>;

  return <Dashboard company={currentCompany} onLogout={handleLogout} isMasterAdmin={isMaster} onSwitchToAdmin={()=>setMasterView('admin')} />;
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
