# Verificação real do Gemini — 11 de outubro de 2026

Ambiente local: Gemini 3.1 Flash-Lite, Gemini Embedding 2, PostgreSQL com pgvector,
API FastAPI, worker separado e interface Next.js. O usuário autorizou enviar os três
primeiros livros completos à API, usando sua cota gratuita. Nenhuma configuração
de cobrança ou adição de créditos foi feita. Os custos apresentados pelo aplicativo
são estimativas equivalentes à tabela paga, não confirmação de cobrança na conta Google.

## Corpus e escala

O corpus privado `pdf-34ca983d61b4cf41` contém 57 capítulos, 914 páginas de texto e
738 fragmentos indexados. As páginas são as do PDF fornecido; capas e páginas sem
texto não entram na contagem de fontes. Os livros IV–VII não foram enviados neste corpus.

| Escopo | Capítulos | Páginas de texto | Fragmentos indexados |
| --- | ---: | ---: | ---: |
| A Pedra Filosofal | 17 | 263 | 208 |
| A Câmara Secreta | 18 | 284 | 233 |
| O Prisioneiro de Azkaban | 22 | 367 | 297 |
| Total | 57 | 914 | 738 |

A indexação foi feita em lotes de até 16 documentos independentes. Uma tentativa
recebeu HTTP 429; o processamento retomou apenas os fragmentos sem vetor, preservando
os já concluídos. O adaptador verifica um vetor válido de 768 dimensões por documento.

## Full Context com livros completos

Foram montados e enviados escopos completos de um, dois e três livros. A auditoria
do contexto persistido confirmou todas as fontes e seus textos, hashes e intervalos;
as opções de citação preservam todas as palavras sem truncar os livros.

| Escopo cumulativo | Fontes fornecidas | Entrada contada pelo Gemini | Resultado das duas perguntas |
| --- | ---: | ---: | --- |
| Livro I | 263 | 174.726 tokens | HTTP 503 |
| Livros I–II | 547 | 369.244 tokens | HTTP 429 |
| Livros I–III | 914 | 619.639 tokens | HTTP 429 |

Cada escopo recebeu uma pergunta respondível e uma pergunta sem evidência no
escopo. As seis tentativas falharam no provedor, portanto não receberam aprovação
de qualidade. A integridade do envio foi verificada, mas não substitui uma resposta
bem-sucedida. A entrada inclui identificadores, opções de citação e instruções, além
do texto dos livros; as contagens acima pertencem à configuração daquela rodada.

A interface local usa um limite de 30.000 tokens de entrada para Full Context,
contados pelo provedor antes de gerar. Escopos maiores são recusados com uma mensagem
para reduzir capítulos ou usar RAG. O sistema não recorta silenciosamente o livro.

## Perguntas e critérios

O conjunto de escala usa seis perguntas:

1. Como o sacrifício de Ron no xadrez permite ao grupo continuar no primeiro livro?
2. Como aliados ajudam nas crises finais dos dois primeiros livros?
3. Como essa ajuda muda nos desfechos dos três livros?
4. Com apenas o primeiro livro, como Harry vence a criatura ao resgatar Ginny na Câmara Secreta?
5. Com apenas os dois primeiros livros, que forma Harry conjura contra os dementadores no lago?
6. Nos três livros, qual é o número exato de alunos matriculados no terceiro ano?

As três últimas exigem abstenção: o conteúdo está em livro excluído ou o número
não foi informado. Uma formulação ambígua anterior do caso 4 foi preservada como
diagnóstico e substituída pela referência explícita à cena fora do escopo.

O conjunto menor usa cinco perguntas nos capítulos 1–3: escolha dos Dursleys,
desaparecimento do vidro no zoológico, tentativas de Vernon de bloquear as cartas,
núcleo da varinha fora desses capítulos, e zoológico com apenas o capítulo 1.
Ele executa os dois métodos, totalizando dez respostas.

Os testes verificam escopo congelado, livros e capítulos, fatos esperados e
abstenções, citações literais e offsets, acesso à evidência, hashes do contexto,
idempotência, isolamento entre visitantes e consumo reportado. A revisão final
também confere os recibos separados da geração e revisão, a soma de tokens e a
liquidação da reserva.

## Correções decorrentes dos testes

O modelo alterava ou combinava citações livres. Agora escolhe identificadores de
trechos exatos; o backend resolve texto e posição usando a fonte original.

As sínteses iniciais recuperavam evidência desbalanceada entre livros. A busca
agora combina candidatos por livro e amplia fragmentos vizinhos. Perguntas explícitas
sobre desfechos podem consultar os últimos dois capítulos de cada livro completo.

A leitura semântica detectou erros que citações exatas não impedem: falsa atribuição
do Vira-Tempo, troca de meia por sapato, janelas supostamente pregadas e perda da
incerteza em uma percepção de Harry. A publicação de respostas factuais passou a
exigir uma segunda chamada que revisa cada oração contra as fontes citadas, preservando
atores, objetos, negacões e qualificadores. Essa revisão usa raciocínio `medium`;
a geração inicial usa `minimal`. Abstenções sem afirmações não precisam da segunda chamada.

O selo de apoio semântico registra uma avaliação do modelo. Ele não representa
certificação humana nem garantia de ausência de erros. A aprovação refere-se aos
casos efetivamente testados, não a qualquer pergunta possível.

Os relatórios com respostas, recibos e textos permanecem em `data/private/`, que é
ignorado pelo Git. Eles também contêm cookies de sessão e não devem ser publicados.
As tentativas malsucedidas foram preservadas para não inflar a taxa de aprovação.

## Reprodução e limites

O executor está em `backend/scripts/verify_live_archive.py`; as perguntas de escala
estão em `backend/tests/live-scale-cases.json`. Executá-lo cria chamadas reais e
requer a mesma autorização de textos, um corpus indexado, API e worker ativos.

O Google oferece [camada gratuita para os modelos utilizados](https://ai.google.dev/gemini-api/docs/pricing),
mas os [limites de requisições e tokens dependem do projeto](https://ai.google.dev/gemini-api/docs/rate-limits).
As falhas observadas não permitem prometer que adicionar créditos resolverá toda
indisponibilidade; apenas demonstram que o Full Context grande não ficou utilizável
nesta rodada gratuita. O teste não habilitou cobrança para comparar uma conta paga.

O banco local foi recuperado após um erro no socket temporário de inferência do
Docker Desktop, sem remover o volume. A interface e a API são executadas nativamente;
a execução do conjunto completo de contêineres não foi certificada nesta rodada.
