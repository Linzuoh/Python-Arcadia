window.ARCADIA_V7 = {
  petPowers: {
    pet_slime: {
      key: 'syntax',
      name: 'Gel de Sintaxe',
      short: 'Fareja um problema de sintaxe sem escrever a resposta.',
      detail: 'Analisa apenas a estrutura do seu código. Se houver SyntaxError ou IndentationError, aponta a linha e traduz o tipo de problema. Se a sintaxe estiver válida, avisa que a causa provavelmente é lógica.',
      icon: '◌'
    },
    pet_fox: {
      key: 'error',
      name: 'Faro de Erro',
      short: 'Traduz o último erro e aponta onde começar a investigar.',
      detail: 'Usa o último feedback do executor. Mostra o tipo de erro, uma linha provável e uma primeira hipótese de investigação — sem corrigir o código.',
      icon: '⌁'
    },
    pet_owl: {
      key: 'wiki',
      name: 'Memória da Coruja',
      short: 'Puxa uma peça da Wiki que combina com o código atual.',
      detail: 'Procura conceitos que você já aprendeu e que aparecem no seu código. Abre uma lembrança curta da Wiki para você recuperar a ideia sem receber uma solução.',
      icon: '⌘'
    },
    pet_cat: {
      key: 'indent',
      name: 'Pata Organizada',
      short: 'Procura um ponto suspeito de indentação ou bloco.',
      detail: 'Inspeciona espaços e blocos como if, elif, else, for, while e def. Ele destaca uma linha para você olhar, mas não move nem reescreve nada.',
      icon: '↳'
    },
    pet_dragon: {
      key: 'spark',
      name: 'Faísca de Estado',
      short: 'Mostra um único instante importante da execução.',
      detail: 'Faz uma inspeção curta do fluxo e revela uma fotografia de uma linha relevante: variáveis naquele instante e qual caminho o Python tomou. Não abre o debugger completo.',
      icon: '✦'
    }
  },
  petVisuals: {
    pet_slime: {glyph:'🟢', className:'slime', idle:'ploc', walk:'deslizando'},
    pet_fox: {glyph:'🦊', className:'fox', idle:'farejando', walk:'correndo'},
    pet_owl: {glyph:'🦉', className:'owl', idle:'observando', walk:'voando'},
    pet_cat: {glyph:'🐈', className:'cat', idle:'descansando', walk:'passeando'},
    pet_dragon: {glyph:'🐉', className:'dragon', idle:'aquecendo as asas', walk:'voando'}
  },
  maxEnergy: 3
};
