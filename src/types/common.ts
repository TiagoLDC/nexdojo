export type Language = 'pt' | 'en' | 'es';

export enum Belt {
  // Kids (até 15 anos)
  WHITE = 'Branca',
  GREY_WHITE = 'Cinza e Branca',
  GREY = 'Cinza',
  GREY_BLACK = 'Cinza e Preta',
  YELLOW_WHITE = 'Amarela e Branca',
  YELLOW = 'Amarela',
  YELLOW_BLACK = 'Amarela e Preta',
  ORANGE_WHITE = 'Laranja e Branca',
  ORANGE = 'Laranja',
  ORANGE_BLACK = 'Laranja e Preta',
  GREEN_WHITE = 'Verde e Branca',
  GREEN = 'Verde',
  GREEN_BLACK = 'Verde e Preta',
  // Adultos (16+ anos)
  BLUE = 'Azul',
  PURPLE = 'Roxa',
  BROWN = 'Marrom',
  BLACK = 'Preta',
  CORAL = 'Coral',
  RED = 'Vermelha',
}

export type Gender = 'Masculino' | 'Feminino' | 'Outro';
export type MaritalStatus = 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'Outro';
export type StudentStatus = 'Active' | 'Inactive' | 'Dropped' | 'Pending';
export type MemberStatus = 'Active' | 'Inactive' | 'Pending';
export type UserAccountStatus = 'Active' | 'Pending' | 'Blocked';
export type UserRole = 'superuser' | 'admin' | 'instructor' | 'staff' | 'student' | 'guest';
export type SenderRole = 'superuser' | 'admin' | 'instructor' | 'staff';
export type SystemPlanName = 'Free' | 'Silver' | 'Gold' | 'Black Belt' | 'VIP';
export type PlanStatus = 'Active' | 'Expired' | 'Trial' | 'Suspended' | 'Canceled';
export type PixType = 'CPF' | 'CNPJ' | 'E-mail' | 'Telefone' | 'Aleatória';
export type CalendarEventType = 'no-class' | 'event';
export type ClassSessionStatus = 'In Progress' | 'Finalized';
export type RecycleBinItemType = 'student' | 'instructor' | 'template';
export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'paid' | 'pending';
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
