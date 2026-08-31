# Frontend do Checklist

SPA Vue publicada em `/checklist/`.

```bash
npm run dev      # desenvolvimento local
npm test         # testes
npm run build    # artefato em dist/
npm run deploy   # publicação atômica na VPS
```

As variáveis `VITE_APP_BASE_URL` e `VITE_GATEWAY_URL` são obrigatórias no build
de produção. Consulte o [guia de operação](../docs/OPERACAO.md) para
configuração, deploy e diagnóstico.
