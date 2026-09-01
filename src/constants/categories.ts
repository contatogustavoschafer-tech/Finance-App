export interface CategoryDef {
  id: string;
  name: string;
  type: 'DESPESA' | 'RECEITA' | 'AMBOS';
  icon: string;
  color: string;
  bgColor: string;
  textColor: string;
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'alimentacao',
    name: 'Alimentação',
    type: 'DESPESA',
    icon: 'Utensils',
    color: '#f97316',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
  },
  {
    id: 'mercado',
    name: 'Supermercado',
    type: 'DESPESA',
    icon: 'ShoppingCart',
    color: '#0ea5e9',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
  },
  {
    id: 'transporte',
    name: 'Transporte',
    type: 'DESPESA',
    icon: 'Car',
    color: '#6366f1',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
  },
  {
    id: 'moradia',
    name: 'Moradia & Contas',
    type: 'DESPESA',
    icon: 'Home',
    color: '#8b5cf6',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
  },
  {
    id: 'saude',
    name: 'Saúde & Farmácia',
    type: 'DESPESA',
    icon: 'HeartPulse',
    color: '#ec4899',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
  },
  {
    id: 'lazer',
    name: 'Lazer & Viagens',
    type: 'DESPESA',
    icon: 'Sparkles',
    color: '#14b8a6',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
  },
  {
    id: 'educacao',
    name: 'Educação',
    type: 'DESPESA',
    icon: 'GraduationCap',
    color: '#3b82f6',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
  },
  {
    id: 'compras',
    name: 'Compras & Vestuário',
    type: 'DESPESA',
    icon: 'ShoppingBag',
    color: '#f43f5e',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
  },
  {
    id: 'assinaturas',
    name: 'Assinaturas & Tech',
    type: 'DESPESA',
    icon: 'Tv',
    color: '#06b6d4',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-700',
  },
  {
    id: 'caixinha',
    name: 'Caixinha & Reserva',
    type: 'DESPESA',
    icon: 'PiggyBank',
    color: '#10b981',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
  },
  {
    id: 'pets',
    name: 'Pets & Petshop',
    type: 'DESPESA',
    icon: 'Heart',
    color: '#f43f5e',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
  },
  {
    id: 'viagens',
    name: 'Viagens & Turismo',
    type: 'DESPESA',
    icon: 'Plane',
    color: '#0ea5e9',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
  },
  {
    id: 'salario',
    name: 'Salário & Renda',
    type: 'RECEITA',
    icon: 'Briefcase',
    color: '#10b981',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
  },
  {
    id: 'freelance',
    name: 'Freelance & Serviços',
    type: 'RECEITA',
    icon: 'Laptop',
    color: '#22c55e',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
  },
  {
    id: 'investimentos',
    name: 'Investimentos & Dividendos',
    type: 'RECEITA',
    icon: 'TrendingUp',
    color: '#059669',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-800',
  },
  {
    id: 'outros',
    name: 'Outros',
    type: 'AMBOS',
    icon: 'Layers',
    color: '#64748b',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-700',
  },
];

export const PAYMENT_METHODS = [
  'PIX',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Dinheiro',
  'Boleto',
  'Transferência',
  'Outro',
] as const;

export function getCategoryMeta(categoryName: string): CategoryDef {
  const match = CATEGORIES.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase() || c.id === categoryName.toLowerCase()
  );
  if (match) return match;
  return CATEGORIES.find((c) => c.id === 'outros')!;
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}
