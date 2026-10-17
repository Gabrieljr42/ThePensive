# Pensieve — plano para uma ambientação 3D memorável

**Proposta de 6 de outubro de 2026.** Base: inspeção do código atual e da aplicação local em `http://127.0.0.1:3000/`, incluindo entrada, mesa e consulta preparada. Este documento define a próxima evolução; a imagem abaixo é um conceito artístico, e as etapas ainda serão implementadas.

**Direção recomendada: uma biblioteca viva organizada ao redor de uma bacia de memórias.** A sala recebe o visitante, os livros fornecem as lembranças, a penseira as reúne e os tomos permitem investigar o resultado. O salto de qualidade vem da composição, dos objetos e da luz trabalhando juntos.

![Conceito artístico da biblioteca com bacia de memórias, líquido prateado e luz de velas](concepts/penseira-conceito.png)

A imagem estabelece materiais, contraste e atmosfera. Para a cena executável, reduzir a quantidade de detalhes periféricos, reservar espaço para os controles e manter o piso mais fosco. Parte da arquitetura distante pode ser pré-renderizada. A imagem não representa desempenho medido nem um modelo 3D pronto.

## 1. O que a versão atual já oferece e onde está o ganho

A base já possui React Three Fiber, Three.js, GSAP, Zustand, livros interativos, biblioteca com instâncias, câmera dirigida, fios de luz e níveis de qualidade. O plano aproveita essa estrutura.

| Constatação na versão inspecionada | Consequência visual | Próxima mudança |
|---|---|---|
| Mesa e livros próximos são construídos principalmente com caixas; a janela usa formas simples. | As silhuetas parecem provisórias, especialmente na aproximação da câmera. | Modelar os objetos próximos com bordas, espessura e detalhes de construção. |
| Pedra, madeira e tecido compartilham a mesma família de ruído, com parâmetros diferentes. | O piso fica muito marcado; materiais distintos acabam parecidos. | Criar materiais próprios: veio da madeira, poros da pedra, trama do couro e metal oxidado. |
| O grande feixe de luz aparece como uma forma geométrica atravessando a sala. | O efeito chama mais atenção que os objetos e enfraquece a profundidade. | Usar luz direcional coerente com a janela e névoa localizada, suave e pouco opaca. |
| A mesa ocupa muito do primeiro plano; não há uma penseira física como ponto focal. | Falta um objeto que resuma a identidade do nome Pensieve. | Colocar a bacia em um pedestal baixo, atrás da área de escrita, sempre visível nas vistas principais. |
| Ao entrar, um formulário largo e a lista de volumes cobrem boa parte da cena. | A ambientação perde presença justamente durante o uso. | Redesenhar a composição entre o espaço 3D e os controles em HTML. |
| A coreografia de busca contém oito candidatos e três selecionados definidos no código. | A encenação está vinculada a um exemplo específico. | Fazer luz, fios e estados responderem aos dados de cada execução. |

**Nota sobre a base:** o README descreve uma etapa anterior com duas coleções e `/ask`. A entrada atual usa `MidnightArchive`, o atalho `/?at=desk`, sete volumes demonstrativos e `mockArchiveAdapter`. Este plano usa o código e a prévia atuais como referência. A integração real de IA é uma frente própria; a ambientação deve continuar identificando a demonstração enquanto usar dados preparados.

## 2. A penseira como objeto principal

A referência de Harry Potter combina com o produto: um recipiente para examinar e relacionar memórias. A descrição oficial fala em uma bacia larga e rasa, de pedra ou metal, e em lembranças que podem ser revisitadas. A interpretação proposta mantém essa ideia em uma peça desenhada para o Pensieve. [Referência oficial da Penseira](https://www.harrypotter.com/writing-by-jk-rowling/pensieve).

**Forma.** Bacia larga e rasa, apoiada em pedestal curto; borda espessa e arredondada, talhada em pedra clara envelhecida. O interior precisa ser visível na câmera da mesa. Um anel de gravações originais e pequenos detalhes de latão dão identidade. Definir escala junto com mesa e livros para que o objeto pareça pesado e utilizável.

**Superfície.** Líquido prateado, leitoso e perolado, com filamentos internos lentos. O centro parece profundo, a borda reflete a janela e uma névoa discreta permanece próxima à superfície. O brilho preserva a textura da pedra.

**Resposta à presença.** Ao apontar ou focar o controle equivalente, uma pequena ondulação surge e a borda ganha luz. Selecionar um livro estabelece uma ligação curta entre livro e líquido. O estado também tem rótulo e indicação de seleção no HTML.

**Resposta à pergunta.** Ao enviar, um fio sai do selo do manuscrito e toca o líquido. Uma onda se expande; as fontes consultadas chegam em filamentos. Ao terminar, a superfície se acalma e conduz o olhar aos tomos de resposta.

**Resposta à citação.** Um fio destacado liga a afirmação ao trecho de origem. Um breve movimento da superfície sugere entrar na memória; a fonte aparece em uma folha legível. Ao fechar, o foco retorna à citação e a câmera recupera seu enquadramento.

**Como construir.** Fazer o modelo de destaque em Blender, exportar GLB e separar corpo, aro e superfície. Para experimentar proporções rapidamente, uma geometria de revolução pode servir de estudo. O acabamento final usa malha com bordas trabalhadas e detalhes finos gravados em mapas de normal.

O líquido terá shader próprio com duas camadas de fluxo, distorção moderada, brilho dependente do ângulo e ondas radiais de interação. A primeira versão usa reflexão de ambiente estática e aparência predominantemente opaca. A luz prateada que atinge a mesa precisa de iluminação ou projeção própria: emissão do material, sozinha, não ilumina os objetos ao redor.

## 3. Melhorias dos demais objetos

| Objeto | Direção de acabamento | Papel na experiência | Prioridade |
|---|---|---|---|
| Bacia e pedestal | Pedra porosa, bordas gastas, entalhes e pequenos metais incrustados. | Receber a pergunta e reunir as memórias. | P0 |
| Livros selecionáveis | Lombada curva, capas com espessura, costura, páginas irregulares e douração localizada. | Escolher as fontes; um deslocamento curto confirma a seleção. | P0 |
| Mesa | Madeira com veio orientado, junções, quinas gastas e marcas de uso concentradas. | Sustentar visualmente manuscrito, livros e instrumentos. | P0 |
| Estantes e arquitetura | Molduras, prateleiras com espessura, vãos e arcos; agrupamentos assimétricos de livros. | Construir profundidade e enquadrar a bacia. | P1 |
| Janela do observatório | Arco com volume, caixilhos legíveis e céu em camadas discretas. | Justificar a luz fria e a direção das sombras. | P1 |
| Velas | Cera escorrida, pavio, chama pequena e variação lenta de intensidade. | Criar pontos de luz quente e escala humana. | P1 |
| Astrolábio | Latão com pátina, anéis finos e marcações contidas. | Representar RAG, Full Context e Compare, com controles HTML correspondentes. | P1 |
| Frascos, pena e selos | Poucas peças com materiais distintos e posicionamento intencional. | Sugerir trabalho em andamento; frascos podem representar consultas salvas quando essa função existir. | P2 |

Produzir três famílias de livros e variar cor, altura, desgaste e ornamentação. Nas estantes distantes, manter instâncias e geometria simples. Investir detalhe nos objetos que realmente aparecem perto da câmera. O conjunto deve sugerir uma pessoa pesquisando: livro aberto, folha deslocada, cera acumulada e um lugar de leitura reconhecível.

## 4. Composição, luz e materiais

**Entrada.** Título em uma região calma à esquerda; bacia visível no terço direito; estantes formam a moldura e a janela dá profundidade. Uma vela ou borda da mesa no primeiro plano estabelece escala. A ação de entrar fica disponível imediatamente, inclusive enquanto os recursos visuais carregam.

**Mesa.** Reservar uma faixa superior para observar a bacia. A pergunta ocupa um manuscrito compacto abaixo ou ao lado, conforme a largura. A seleção de livros usa uma lateral ou faixa recolhível. Testar a composição com texto real desde o primeiro estudo de câmera.

**Leitura.** Respostas ganham a área principal. A bacia continua reconhecível na margem ou no fundo; partículas e movimento diminuem. O texto permanece em HTML, com seleção, busca, zoom e navegação por teclado. Reposicionar os elementos por estado evita que uma folha enorme esconda a cena durante todo o percurso.

**Luz.** Trabalhar com três fontes perceptíveis: luar azul acinzentado pela janela, âmbar das velas e prata da bacia. Primeiro calibrar exposição e contraste com materiais neutros; depois aplicar as texturas. A iluminação deve separar os planos e deixar visíveis os contornos dos objetos importantes.

**Sombra e reflexão.** Gravar iluminação e oclusão da arquitetura estática nas texturas. Reservar sombra dinâmica para os objetos próximos e a principal fonte de luz. Usar mapa de ambiente coerente com a sala para dar reflexão ao metal e ao líquido. O Three.js oferece `Scene.environment` para os materiais físicos. [Documentação de Scene](https://threejs.org/docs/pages/Scene.html).

**Atmosfera.** Poeira aparece onde a luz a alcança. Névoa fica no fundo e próxima do líquido. Clarões, oscilação de câmera, profundidade de campo e brilho têm intensidade baixa; o modo de leitura reduz a atividade. Bloom, se necessário, será localizado no líquido e nas chamas.

| Papel | Cor inicial para estudo | Aplicação |
|---|---|---|
| Sombra profunda | `#0B1018` | Cantos e arquitetura distante |
| Azul de luar | `#71899B` | Fundo, recortes e luz ambiente |
| Prata de memória | `#DCE7E7` | Líquido e fios |
| Âmbar | `#D5A15B` | Velas e acentos de RAG |
| Latão antigo | `#8A7047` | Ferragens e instrumentos |
| Papel | `#E7D9B8` | Leitura e escrita |

As cores são pontos de partida de direção de arte. Contraste de texto e estados de interação precisam ser verificados no resultado renderizado.

## 5. Um ritual que explique a pesquisa

| Momento | O que acontece na sala | O que o usuário consegue fazer |
|---|---|---|
| Chegada | Superfície prateada em repouso; arquitetura aparece sem espera obrigatória. | Entrar ou ir direto à mesa. |
| Seleção | O livro avança discretamente e uma ligação com a bacia aparece. | Escolher volumes por clique, toque ou teclado. |
| Envio | Fio do manuscrito toca o líquido; uma onda percorre a superfície. | Ver o envio confirmado e cancelar uma execução quando suportado. |
| RAG | Fios individuais representam os trechos recuperados; os escolhidos permanecem. | Entender quais fontes entraram na consulta. |
| Full Context | Uma corrente contínua representa o escopo efetivamente fornecido. | Ver quais volumes ou capítulos compõem esse escopo. |
| Compare | Dois fluxos identificados alimentam os dois tomos, usando cor e forma distintas. | Comparar respostas e métricas sem depender apenas da cor. |
| Resultado | O líquido desacelera; a luz orienta o olhar para a resposta. | Ler imediatamente, copiar e seguir citações. |
| Evidência | Um filamento conecta a afirmação ao trecho; o ambiente fica mais quieto. | Inspecionar a fonte, fechar e voltar ao ponto de leitura. |
| Falha ou ausência de evidência | O líquido retorna ao repouso; uma mensagem clara explica o estado. | Corrigir a pergunta ou tentar novamente. |

O Full Context representa o conjunto realmente enviado ao modelo, que pode ser limitado pela configuração. A animação nunca implica que todos os livros disponíveis foram processados. Quantidade de fios vem dos dados; grandes quantidades podem ser agrupadas visualmente, com contagem textual correta.

Usar cerca de 150–250 ms para respostas pequenas e 600–1.000 ms para a aproximação principal, ajustando pela sensação no protótipo. A coreografia acompanha os estados de execução. Uma resposta pronta pode aparecer antes do fim do efeito; uma execução lenta continua sinalizada sem porcentagem inventada. O encerramento de uma timeline não define sucesso da consulta.

**Som opcional.** Oferecer um controle explícito de ambiente sonoro. Depois da ativação, usar camadas discretas de sala, papel e líquido, com eventos curtos nas interações. Guardar a preferência, disponibilizar volume e silenciar ao sair da aba. O som entra depois que o percurso visual estiver resolvido.

## 6. Integração com o projeto existente

Manter a stack atual. Um único Canvas cuida do espaço, e o HTML cuida de texto e ações. O Zustand guarda estados de produto; GSAP interpola a apresentação. A partir de eventos e identificadores de execução, um adaptador produz o estado visual da sala.

| Arquivo ou grupo existente | Trabalho proposto |
|---|---|
| `frontend/src/features/archive/scene/ArchiveCanvas.tsx` | Compor bacia, iluminação e ambiente; prever carregamento, falha de WebGL e imagem alternativa. |
| `scene/Desk.tsx`, `scene/Volume3D.tsx`, `scene/Stacks.tsx` | Introduzir os modelos finalizados, materiais próprios e variações das estantes. |
| `scene/sceneLayout.ts` | Centralizar posições dos objetos, pontos de ligação e composições das três vistas. |
| `scene/CameraRig.tsx` e `director.ts` | Criar enquadramentos para entrada, mesa e evidência; interromper transições com segurança. |
| `scene/Moonbeam.tsx`, `scene/ObservatoryWindow.tsx` | Tornar a luz coerente com a arquitetura e reduzir a visibilidade da malha do feixe. |
| `MidnightArchive.tsx` e `ui/*` | Reservar espaço visual para a bacia; melhorar a leitura e os controles em telas estreitas. |
| `threads/anchors.ts` e `threads/ThreadLayer.tsx` | Adicionar âncoras da bacia e ligar fios a IDs de fontes; pausar o desenho quando inativo. |
| `store.ts`, `uniforms.ts`, `model.ts` | Separar estado de consulta de estado de animação; representar carregamento, falha e cancelamento. |
| `quality.ts` e `archiveBudget.ts` | Aplicar limites por recurso e reduzir efeitos conforme o desempenho observado. |

Componentes novos sugeridos: `PensieveBasin`, `MemorySurface`, `MemoryWisps`, `ArchiveLighting`, `ArchiveFallback` e um adaptador de execução para apresentação. Os nomes são uma divisão proposta de responsabilidades.

**Dois cuidados concretos da base atual.** O `director.ts` encena oito candidatos e descarta cinco fixos; isso precisa virar uma apresentação derivada do trace disponível. A cena também usa `preserveDrawingBuffer: true` e leitura de pixels para diagnóstico; avaliar mover esse custo para um modo de laboratório, com verificação de desempenho antes e depois.

Cada consulta terá um ID usado para invalidar animações e retornos antigos. Uma resposta atrasada não pode substituir a consulta atual. O modo sem movimento deve atualizar a câmera e os materiais diretamente e solicitar um frame quando necessário; interromper a animação não pode interromper as mudanças de estado.

## 7. Produção dos recursos 3D

1. Montar um estudo de volumes simples com o layout real e as três câmeras.
2. Finalizar bacia, livros e mesa; verificar as silhuetas com material neutro.
3. Criar UVs e mapas de cor, normal, rugosidade e oclusão com escala coerente.
4. Gravar detalhes finos e a iluminação estática; usar peças modulares para arquitetura.
5. Exportar GLB, reduzir malhas distantes e compartilhar materiais onde fizer sentido.
6. Avaliar compressão Meshopt ou Draco e texturas KTX2, incluindo tempo de decodificação nos aparelhos de teste.
7. Empacotar modelos, texturas e decodificadores locais; documentar origem e licença dos recursos usados.

O `GLTFLoader` suporta os caminhos de compressão de malha e a integração de KTX2. O `KTX2Loader` detecta suporte e converte para um formato comprimido aceito pela GPU. A configuração final deve ser validada contra as versões instaladas. [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) e [KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html).

Reservar os materiais mais caros para os objetos que se beneficiam deles. Por exemplo, transmissão física pode ajudar alguns frascos, mas a superfície prateada pode funcionar com um shader mais simples. `MeshPhysicalMaterial` acrescenta custo por pixel conforme os recursos ativados. [Documentação de materiais físicos](https://threejs.org/docs/pages/MeshPhysicalMaterial.html).

## 8. Celular, acessibilidade e orçamento visual

No celular, a bacia ocupa uma área visual curta acima da pergunta; a lista de volumes vira um seletor compacto e a comparação mantém abas claras. A evidência usa uma folha que respeita a altura disponível. Nenhuma ação exige apontar com mouse, arrastar ou navegar com câmera livre.

Todos os objetos acionáveis têm controles HTML equivalentes, foco visível e nomes claros. Com movimento reduzido, manter iluminação e materiais, retirando deslocamentos, ondas contínuas e partículas. Permitir também leitura silenciosa e modo leve manual. A imagem alternativa da sala deve aparecer se o WebGL falhar, sem impedir a pesquisa.

Os valores abaixo são **metas iniciais de engenharia**, ainda sem benchmark desta proposta:

| Recurso | Desktop com capacidade | Celular ou modo equilibrado | Modo leve |
|---|---|---|---|
| Fluidez durante interação | Alvo de 60 fps | Alvo de 30 fps sustentados | Atualizar ao interagir |
| Triângulos visíveis | Até aproximadamente 150 mil | Até aproximadamente 60 mil | Até 25 mil ou imagem |
| Chamadas de desenho | Alvo de até 120 | Alvo de até 60 | Minimizar ou imagem |
| Resolução do Canvas | Manter inicialmente o teto atual de DPR 1,25 | DPR 1–1,25 | DPR 1 ou imagem |
| Texturas | 2K nos objetos principais; 1K no restante | Variantes 1K | Variantes 512 ou imagem |
| Luz e efeitos | Uma sombra dinâmica; brilho seletivo se couber | Sombra gravada; líquido simplificado | Materiais estáticos |
| Carga adicional de arte 3D | Até cerca de 5 MB comprimidos, progressivos | Até cerca de 3 MB | Poster otimizado |

O orçamento de arte é separado de JavaScript, fontes e decodificadores; medir o total de rede e a memória das texturas após decodificação. Como ponto de partida, reservar 20–30 mil triângulos para bacia e pedestal, com uma versão de cerca de 5 mil para aparelhos modestos.

Carregar primeiro a interface e um poster leve; depois o objeto principal e, por último, os detalhes da sala. Manter a classificação inicial conservadora já existente e ajustar pela duração dos frames, com intervalo suficiente entre mudanças para evitar oscilações. Reaproveitamento de recursos, instâncias e renderização sob demanda são mecanismos documentados pelo React Three Fiber. [Guia de desempenho](https://r3f.docs.pmnd.rs/advanced/scaling-performance).

Pausar os loops 3D, fios 2D e áudio com a aba oculta. O estado de movimento reduzido deve ser uma preferência de interação independente da capacidade gráfica. Brilho, névoa e reflexões adicionais só entram se o orçamento continuar atendido.

Como metas da página completa, acompanhar LCP até 2,5 s, INP até 200 ms e CLS até 0,1 no percentil 75 de dados de campo quando houver tráfego. No desenvolvimento, registrar condições e resultados de laboratório separadamente. [Critérios de Core Web Vitals](https://web.dev/articles/vitals).

## 9. Ordem de execução e entregas verificáveis

Estimativa preliminar para uma pessoa com experiência em frontend 3D e modelagem: **8–14 dias úteis**, mais uma rodada de revisão. A faixa depende da produção dos modelos, dos aparelhos disponíveis para teste e do acabamento escolhido. Pode mudar após o primeiro estudo de cena.

| Etapa | Escopo | Entrega verificável | Esforço indicativo |
|---|---|---|---|
| 1. Composição | Referências, baseline visual, bacia provisória, câmeras e espaço dos controles. | Entrada, mesa e leitura reconhecíveis em desktop e celular, mesmo sem texturas. | 1 dia |
| 2. Peça principal | Modelo da bacia, líquido, ondas, reflexão e resposta à seleção. | Uma pergunta preparada chega à bacia e revela a resposta; versão leve disponível. | 2–3 dias |
| 3. Sala e objetos | Livros, mesa, materiais, arquitetura próxima e iluminação. | Três vistas com acabamento coerente e orçamento de recursos registrado. | 2–4 dias |
| 4. Ritual e evidência | Integração dos modos, fontes, estados, citações e retorno à leitura. | Percurso completo nos três modos, incluindo erro e execução interrompida. | 2–3 dias |
| 5. Acabamento | Celular real, teclado, movimento reduzido, carregamento, desempenho e som opcional. | Comparação antes/depois e relatório curto com aparelhos e condições. | 1–3 dias |

**Primeira entrega recomendada:** uma cena vertical completa com a bacia acabada, uma mesa, um livro e uma pergunta preparada. Ela valida identidade, interação e desempenho antes de ampliar a biblioteca. O entorno pode permanecer simples durante esse marco.

Refração complexa, reflexos dinâmicos da sala inteira e uma navegação livre ficam para avaliação posterior ao núcleo. Os recursos que mais determinam o resultado agora são a bacia, as silhuetas próximas, a iluminação e a integração dos controles.

## 10. Como decidir se a melhoria funcionou

- A bacia é identificável na entrada e continua presente ao perguntar, em desktop e celular.
- Madeira, pedra, couro e latão têm aspecto e escala próprios nos enquadramentos reais.
- O líquido parece prateado e profundo, sem apagar seus detalhes com brilho.
- A fonte de cada luz é compreensível; os feixes não parecem superfícies sólidas.
- É possível escolher fontes e enviar uma pergunta sem esperar uma introdução.
- RAG e Full Context têm comportamentos distintos que correspondem aos dados e ao escopo consultado.
- A resposta fica disponível quando pronta; uma citação mostra o trecho correto e permite voltar ao ponto anterior.
- A leitura longa permanece confortável; a cena reduz sua atividade nesse momento.
- O percurso funciona com teclado, toque, zoom, movimento reduzido e falha de WebGL.
- O desempenho é medido nas vistas de entrada, busca e leitura, incluindo alguns minutos de uso em celular real.

Capturar as mesmas vistas antes e depois, com viewport e estado fixos. Fazer uma revisão visual com poucas pessoas: pedir que identifiquem a peça principal, encontrem como perguntar e abram uma fonte. Essa observação revela problemas que contagem de pixels e testes de lógica não capturam.

Na implementação, adaptar os testes existentes de cena: alguns hoje exigem variação de ruído no piso e nas estantes, o que pode penalizar o acabamento mais discreto proposto. Verificar renderização, transições e legibilidade sem obrigar uma textura específica. Depois executar os checks de tipo, lint e navegação adequados às mudanças. Os testes não foram reexecutados para este documento de planejamento.

**O resultado esperado:** entrar em uma biblioteca de memórias e compreender a pesquisa por meio de seus objetos. A penseira concentra a identidade, a luz revela os materiais e a interface acompanha o ritmo de consultar, comparar e ler.
