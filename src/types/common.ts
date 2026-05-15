export type Language = 'pt' | 'en' | 'es';

export enum Belt {
  WHITE = 'Branca',
  GREY = 'Cinza',
  YELLOW = 'Amarela',
  ORANGE = 'Laranja',
  GREEN = 'Verde',
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
export type SystemPlanName = 'Free' | 'Silver' | 'Gold' | 'Black Belt';
export type PlanStatus = 'Active' | 'Expired' | 'Trial' | 'Suspended' | 'Canceled';
export type PixType = 'CPF' | 'CNPJ' | 'E-mail' | 'Telefone' | 'Aleatória';
export type CalendarEventType = 'no-class' | 'event';
export type ClassSessionStatus = 'In Progress' | 'Finalized';
export type RecycleBinItemType = 'student' | 'instructor' | 'template';
export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'paid' | 'pending';
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
