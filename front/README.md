This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Imagens

Padrões adotados para otimização de imagens com `next/image`:

- Dimensões explícitas: sempre definimos `width` e `height` para evitar layout shift (CLS).
- Otimização nativa: removemos `unoptimized`; o Next otimiza e serve AVIF/WebP quando possível (`images.formats`).
- Domínios remotos: adicionamos `remotePatterns` em `next.config.ts` para permitir otimização das imagens servidas pelo backend local (`http://localhost:3001`). Para produção, inclua seus domínios (CDN/S3/Firebase) no mesmo bloco.
- Prioridade: use `priority` apenas para imagens “acima da dobra” e realmente críticas (ex.: hero do carrossel). Evite marcar muitas imagens como prioritárias.
- Placeholder de blur: para melhorar a percepção de carregamento e reduzir CLS, usamos `placeholder="blur"` com um `blurDataURL` base64 genérico. Exemplo:

```tsx
<Image
  src={url}
  alt={alt}
  width={1200}
  height={240}
  placeholder="blur"
  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="
  priority
/>
```

Observações:

- Para placeholders mais fiéis, considere gerar LQIP/blur por imagem (ex.: via pipeline no upload) e preencher `blurDataURL` correspondente.
- Se suas imagens estiverem em outros domínios, adicione-os em `next.config.ts` (campo `images.remotePatterns`), por exemplo:

```ts
images: {
	remotePatterns: [
		{ protocol: 'https', hostname: 'cdn.exemplo.com', pathname: '/**' },
		{ protocol: 'https', hostname: 's3.amazonaws.com', pathname: '/meu-bucket/**' },
	],
}
```

Com esses padrões, garantimos boa performance, carregamento suave e manutenção simples.
