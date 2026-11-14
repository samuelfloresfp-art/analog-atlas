# Global Offer — Domínio grátis + hospedagem (GoDaddy Registry / Porkbun)

> Fonte: print da página de Global Offers do NASA Space Apps 2026 (perfil → OFFERS), 14/11/2026. `[DADO — print]`
> Os links "Claim Your Offer Now" e "non-premium domains" estão na página original e não aparecem no print. Pegue os links lá; não invente URLs.

## O que a oferta inclui
- Um domínio grátis + 1 ano de hospedagem de site, exclusivo para participantes do NASA Space Apps.
- Certificado SSL grátis, válido pelo mesmo período de 1 ano.
- Grátis **apenas para domínios não-premium**.
- O registro é feito pela **Porkbun**, parceira de registro da GoDaddy.
- Suporte: support@porkbun.com

## Como resgatar
1. **T-3 — Iniciar:** clicar em "Claim Your Offer Now" na página de Offers e buscar o domínio da missão (verificar se é non-premium).
2. **T-2 — Contato:** preencher os dados de contato, com um e-mail válido.
3. **T-1 — Confirmar:** abrir o e-mail e digitar o código recebido.
4. **T-0 — Finalizar:** concluir o registro grátis na Porkbun.

## Notas para o projeto `[DEDUÇÃO]`
- **Uso:** URL própria para o "Link to Project Demo" / "Link to Final Project" (ex.: `analogatlas.<tld>`). O site é estático (HTML/JS ou build do Vite), então serve para hospedagem simples ou para apontar o domínio para o GitHub Pages.
- **Plano B obrigatório:** manter o deploy no GitHub Pages. Domínio novo pode demorar para propagar o DNS; não deixar para domingo à noite.
- **Rotas:** o site usa roteamento por hash (`#/...`), então funciona em hospedagem estática sem configurar rewrites.
- **Testar** o link final em aba anônima antes de enviar (regra: links públicos, sem senha).
- **Dados pessoais:** o formulário pede o contato de um membro da equipe; isso não entra no repositório nem no site.
- **Licença/nomes:** não usar "NASA" no nome do domínio (regra: não usar nem modificar marcas da NASA). `[DEDUÇÃO a partir da regra oficial]`
