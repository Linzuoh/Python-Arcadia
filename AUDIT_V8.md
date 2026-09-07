# Auditoria V8

A V8 passou por uma revisão geral com foco em quatro regras:

1. **Ensinar antes de cobrar** — desafios não devem depender de uma ferramenta introduzida apenas em nível futuro.
2. **Exemplo executável** — a área “Experimentar” deve conter código que consiga rodar isoladamente no contexto da aula.
3. **Teste coerente** — a correção deve validar o contrato real, sem condições impossíveis ou verificações que sempre passam.
4. **Contextos variados** — treinos e desafios diários reutilizam os conceitos, não o mesmo enunciado da aula.

## Verificações realizadas
- 100 níveis e 10 provas revisados.
- starters e testes Python validados sintaticamente.
- exemplos didáticos normais revisados para execução autônoma.
- provas revisadas para casos de retorno `None` e contratos impossíveis.
- banco de desafios extras revisado contra pré-requisitos.
- banco diário revisado contra pré-requisitos.
- JavaScript principal e extensões V6/V7/V8 validados sintaticamente.
- busca por identificadores pessoais conhecidos: nenhum encontrado.

A auditoria não transforma o curso em algo “congelado”: novos erros pedagógicos encontrados durante o uso devem continuar sendo corrigidos, mas a V8 reduz bastante os casos de conteúdo aparecendo antes da hora.
