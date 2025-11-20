# Mock de `localStorage` no SSR (Next.js)

Este projeto aplica um mock seguro de `localStorage` durante a execução no servidor (SSR / Node runtime) para evitar erros quando alguma biblioteca ou configuração tenta acessar `localStorage` antes do hydration no navegador.

## Por que isso é necessário?

`localStorage` é uma API do navegador. No ambiente Node (SSR, build, Fast Refresh) ela não existe. Qualquer tentativa direta de acesso resulta em erros como:

```
TypeError: localStorage.getItem is not a function
```

Além disso, foi detectado no ambiente uma flag externa (`--localstorage-file`) que injetava um objeto inválido como `global.localStorage`. Para neutralizar isso e impedir que o SSR quebre, adotamos um mock sem efeitos colaterais.

## Implementação

Arquivo: `instrumentation.ts`

Logo ao carregar o módulo, antes da aplicação iniciar, verificamos se o `global.localStorage` é válido. Caso não seja, substituímos por um mock NO-OP:

```ts
if (!process.env.DISABLE_LS_PATCH) {
  const g: any = globalThis as any;
  const ls: any = g.localStorage;
  const valido =
    ls &&
    typeof ls.getItem === "function" &&
    typeof ls.setItem === "function" &&
    typeof ls.removeItem === "function";
  if (!valido) {
    g.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      get length() {
        return 0;
      },
    };
  }
}
```

No client, o wrapper `storage.ts` faz uma verificação adicional e aplica polyfill local caso o objeto do navegador tenha sido corrompido.

## Características do mock

- Não persiste dados entre requisições (é NO-OP).
- Garante que bibliotecas que acessam `localStorage` no SSR não derrubem o servidor.
- Evita depender de polyfills externos e reduz risco de inconsistência de estado.

## Como desativar temporariamente

Se quiser testar o comportamento sem o patch:

```bash
DISABLE_LS_PATCH=1 npm run dev
```

## Boas práticas para componentes

1. Declare componentes que usam `localStorage` com `"use client"` no topo.
2. Inicialize estados dependentes do `localStorage` via função que verifica `typeof window !== 'undefined'` ou usando `useEffect`.
3. Prefira usar o wrapper `storage` (`import storage from '@/app/lib/storage'`) ao invés de acessar diretamente `localStorage`.

## Exemplos

Leitura segura:

```ts
import storage from "@/app/lib/storage";
const token = storage.get("token"); // retorna null se indisponível
```

Leitura dentro de efeito:

```ts
useEffect(() => {
  const raw = storage.get("usuario");
  if (raw) setUser(JSON.parse(raw));
}, []);
```

## Motivos para não usar polyfill persistente no servidor

- SSR não deve armazenar ou evoluir estado de usuário (stateless).
- Evita divergência entre HTML gerado e estado do cliente.
- Reduz ataques e vazamentos acidentais de dados sensíveis.

## Próximos passos recomendados

- Corrigir avisos de ESLint apontados no build (principalmente `no-explicit-any`).
- Migrar `<img>` para `next/image` onde for relevante para desempenho.
- Revisar dependências que possam estar injetando `--localstorage-file` e removê-las.

---

Se você remover o mock, esteja ciente de que qualquer acesso antecipado a `localStorage` voltará a gerar exceções no SSR. Mantenha este arquivo para referência futura.
