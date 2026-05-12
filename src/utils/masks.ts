export const maskCEP = (value: string): string =>
  value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .substring(0, 9);

export const maskCPF = (value: string): string => {
  const d = value.replace(/\D/g, '').substring(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

export const maskRG = (value: string): string => {
  const d = value.replace(/\D/g, '').substring(0, 9);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${d.slice(8)}`;
};

export const maskPhone = (value: string): string => {
  const d = value.replace(/\D/g, '');
  if (d.length > 10) return d.replace(/(\d{2})(\d{1})(\d{4})(\d{4}).*/, '($1) $2.$3-$4').substring(0, 17);
  if (d.length > 6) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  if (d.length > 2) return d.replace(/(\d{2})(\d+)/, '($1) $2');
  return d.length > 0 ? `(${d}` : d;
};

export const maskSensitive = (value: string): string => {
  if (!value) return '';
  if (value.length <= 4) return '****';
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
};

export const maskCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const maskDate = (value: string): string =>
  value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .substring(0, 10);
