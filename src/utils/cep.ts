export interface AddressResult {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  fullAddress: string;
}

export const fetchAddressByCep = async (cep: string): Promise<AddressResult | null> => {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data: Record<string, string> = await response.json();
    if (data['erro']) return null;

    return {
      street: data['logradouro'] ?? '',
      neighborhood: data['bairro'] ?? '',
      city: data['localidade'] ?? '',
      state: data['uf'] ?? '',
      fullAddress: `${data['logradouro']}, ${data['bairro']}, ${data['localidade']} - ${data['uf']}`,
    };
  } catch {
    return null;
  }
};
