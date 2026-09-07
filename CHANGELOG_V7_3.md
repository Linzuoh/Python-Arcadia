# Python Arcádia V7.3

## Correção pedagógica
- N011 (`while`) não exige mais listas nem `append()` antes da aula de listas.
- N012 (`for`/`range`) também não exige mais construir uma lista.
- O treino `fix_012` foi refeito para praticar o limite exclusivo de `range`, sem `append()`.
- `append()` continua sendo introduzido somente no N013, junto com listas.

## Caderno de Erros
- `AssertionError` produzido pela correção automática não é mais tratado como um padrão de erro do aluno.
- Registros antigos desse tipo são removidos automaticamente na migração V7.3.
- Erros reais de sintaxe, indentação, nome, tipo, índice etc. continuam alimentando o Caderno.
- Rascunhos antigos de N011/N012 são resetados automaticamente somente se o nível ainda não foi concluído e o rascunho pertence ao exercício antigo.
