# Python Arcádia V7.2

Correções de estabilidade:

- remove um MutationObserver que podia entrar em loop ao atualizar o texto “Python pronto” e congelar toda a interface;
- Python não é mais carregado automaticamente ao abrir/recarregar a página;
- Pyodide agora é carregado somente ao usar Rodar, Corrigir, Debugger ou um poder que dependa de Python;
- há timeout real para script, inicialização do Pyodide e teste interno;
- falha do Python não bloqueia navegação, Wiki, Loja, Maestria ou conteúdo;
- Ace continua opcional e carrega em segundo plano; o textarea de fallback permanece disponível.
