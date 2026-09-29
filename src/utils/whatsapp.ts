/**
 * Monta o link que abre uma conversa no WhatsApp com a mensagem já preenchida.
 *
 * NÃO trocar por `wa.me` — foi exatamente o que quebrou os emojis da mensagem de retorno
 * (#242/#243). O `wa.me` responde 302 para `api.whatsapp.com/send/` e, ao reescrever a query,
 * substitui TODO caractere com propriedade Emoji por U+FFFD ("�"), esteja ele no BMP ou não:
 * 🥋 (U+1F94B), ⚔️ (U+2694), ⛩️ (U+26E9) e ⚡ (U+26A1) voltam todos como "�", enquanto •
 * (U+2022), – (U+2013) e as letras acentuadas atravessam intactas. Verificado fora do
 * navegador, pelo Location do próprio 302. Indo direto ao destino final não há redirect algum
 * para reescrever nada, e o texto chega como foi enviado.
 */
export function buildWhatsappUrl(phone: string, message: string): string | null {
  const digits = phone?.replace(/\D/g, '');
  if (!digits) return null;
  return `https://api.whatsapp.com/send?phone=55${digits}&text=${encodeURIComponent(message)}`;
}
