# BTX Prontuário (Sem Modal)

Projeto PWA simples e robusto:
- Sem tela de entrada / sem modal (zero risco de travar por overlay)
- Autosave em localStorage
- PDFs sob demanda (jsPDF via CDN)

## Rodar local
Abra `index.html` no navegador.

## Publicar no GitHub Pages
Suba estes arquivos para um repositório e ative GitHub Pages (branch main / root).

## Offline
O app funciona offline (cache via Service Worker).
**Obs:** o jsPDF vem via CDN (precisa internet para gerar PDF). Se você quiser 100% offline, eu troco para jsPDF local dentro do projeto.
