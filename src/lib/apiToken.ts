// Estado de autenticação do cliente HTTP, isolado num módulo SEM imports.
//
// Por que existe: `api.ts` importa `authStore` (para injetar academyId do superusuário) e
// `authStore` precisa avisar o cliente HTTP a cada login/logout. Quando esse par de setters
// morava dentro de `api.ts`, os dois módulos formavam um ciclo de import — e o Rollup é livre
// para escolher qual dos dois inicializa primeiro, escolha que muda de build para build.
//
// Quando o ciclo era resolvido com `authStore` primeiro, o `create(persist(...))` rodava antes
// do corpo de `api.ts`: a hidratação do persist é SÍNCRONA com localStorage, então
// `onRehydrateStorage` chamava `setApiToken` ainda na TDZ do `const`. O ReferenceError era
// engolido em silêncio pelo `toThenable` do zustand (o `.catch` dele re-chama o callback e o
// segundo erro some), e o resultado era um app que renderizava logado mas com `_token` e
// `_onUnauthorized` nulos: TODA requisição saía sem o header Authorization e voltava 401, sem
// nenhum erro no console. Um F5 bastava para derrubar a sessão; só um novo login (que chama o
// setter em runtime, com os módulos já inicializados) devolvia o acesso até o próximo reload.
//
// Este arquivo não importa nada justamente para nunca participar de um ciclo — a ordem de
// inicialização dele é sempre anterior à de quem o importa.

let _token: string | null = null;
let _onUnauthorized: (() => void) | null = null;

export const setApiToken = (token: string | null) => {
  _token = token;
};

export const getApiToken = (): string | null => _token;

export const setUnauthorizedHandler = (handler: () => void) => {
  _onUnauthorized = handler;
};

export const notifyUnauthorized = () => {
  _onUnauthorized?.();
};
