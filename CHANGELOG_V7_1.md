# V7.1 — correção do carregamento infinito

A causa era arquitetural: Ace e Pyodide eram carregados por `<script>` externos síncronos antes do código local do curso. Se um CDN demorasse ou ficasse bloqueado, o navegador nunca chegava ao `boot()` e a tela “Preparando…” ficava para sempre.

Mudanças:
- o site abre imediatamente antes de baixar ferramentas externas;
- Pyodide e Ace carregam em segundo plano com timeout;
- se Ace falhar, aparece um editor simples funcional;
- se Python falhar, o site continua aberto e o status lateral vira um botão de nova tentativa;
- watchdog impede a tela de boot infinita caso um arquivo local falhe;
- cache-bust `v=71`.
