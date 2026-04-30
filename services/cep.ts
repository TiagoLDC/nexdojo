
export const fetchAddressByCep = async (cep: string) => {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();

    if (data.erro) return null;

    return {
      street: data.logradouro,
      neighborhood: data.bairro,
      city: data.localidade,
      state: data.uf,
      fullAddress: `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`
    };
  } catch (error) {
    console.error('Error fetching CEP:', error);
    return null;
  }
};

export const maskCEP = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .substring(0, 9);
};

export const maskCPF = (cpf: string) => {
  const clean = cpf.replace(/\D/g, '').substring(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.substring(0, 3)}.${clean.substring(3)}`;
  if (clean.length <= 9) return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6)}`;
  return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}-${clean.substring(9)}`;
};

export const maskRG = (rg: string) => {
  const clean = rg.replace(/\D/g, '').substring(0, 9);
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.substring(0, 2)}.${clean.substring(2)}`;
  if (clean.length <= 8) return `${clean.substring(0, 2)}.${clean.substring(2, 5)}.${clean.substring(5)}`;
  return `${clean.substring(0, 2)}.${clean.substring(2, 5)}.${clean.substring(5, 8)}-${clean.substring(8)}`;
};

export const maskPhone = (value: string) => {
  const clean = value.replace(/\D/g, '');
  if (clean.length > 10) {
    // Celular: (00) 0.0000-0000
    return clean
      .replace(/(\d{2})(\d{1})(\d{4})(\d{4}).*/, '($1) $2.$3-$4')
      .substring(0, 17);
  } else if (clean.length > 2) {
    // Fixo ou parcial: (00) 0000-0000
    return clean
      .replace(/(\d{2})(\d{4})(\d{4}).*/, '($1) $2-$3')
      .replace(/(\d{2})(\d)/, '($1) $2');
  }
  return clean.length > 0 ? `(${clean}`.substring(0, 3) : clean;
};

export const maskSensitive = (value: string) => {
  if (!value) return '';
  if (value.length <= 4) return '****';
  return `${value.substring(0, 2)}****${value.substring(value.length - 2)}`;
};
