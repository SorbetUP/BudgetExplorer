export type Money = number; // euros

export interface LolfRecord {
  year: number;
  mission_code?: string;
  mission_label?: string;
  programme_code?: string;
  programme_label?: string;
  action_code?: string;
  action_label?: string;
  sous_action_code?: string;
  sous_action_label?: string;
  cp?: Money; // crédits de paiement
  ae?: Money; // autorisations d'engagement
  source?: string;
}

export interface LolfNode {
  id: string;
  code: string;
  label: string;
  level: 'etat' | 'mission' | 'programme' | 'action' | 'sous-action';
  cp: Money;
  ae: Money;
  children?: LolfNode[];
  meta?: Record<string, unknown>;
}

export interface DatasetRef {
  id: string;
  title: string;
  href: string;
  year: number;
  kind: 'depenses' | 'recettes' | 'budget_vert';
  score: number;
}
