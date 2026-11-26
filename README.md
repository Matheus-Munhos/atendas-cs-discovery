# Atendas CS: discovery do portal

Protótipo navegável de todas as telas do portal do time de Sucesso do Cliente da Atendas, na versão final do discovery. Serve para validar as telas com o time de CS e com a diretoria antes do desenvolvimento.

Os números, nomes de franquias, pessoas e valores são **exemplos**. Nada aqui está ligado a dados reais.

## Estrutura

```
atendas-cs-discovery/
├── index.html            Sumário com todas as telas, agrupadas como no canvas
├── README.md             Este arquivo
├── telas/                Versão para abrir no navegador
│   ├── support.js        Runtime que interpreta o formato das telas
│   ├── Mapa.dc.html      Mapa de navegação (comece por aqui)
│   └── ...dc.html        Uma tela por arquivo (33 no total)
└── fonte-canvas/         Arquivos originais do canvas, sem nenhuma alteração
    ├── canvas.json       Posição, tamanho e título de cada tela no canvas
    └── ...dc.html
```

As duas pastas têm as mesmas telas. A diferença é técnica: em `telas/`, as tabelas foram reescritas com `div` (mesmo visual) para o navegador não reorganizar as repetições dentro delas. A pasta `fonte-canvas/` guarda os arquivos exatamente como estão no canvas, para referência e para voltar a editar lá.

## Como abrir

**Mais simples:** abra `index.html` no navegador (duplo clique).

**Recomendado:** sirva a pasta com um servidor local, para evitar restrições do navegador com arquivos locais:

```
npx serve atendas-cs-discovery
```

ou, com Python:

```
cd atendas-cs-discovery
python3 -m http.server 8000
```

e abra http://localhost:8000.

## Como publicar no Vercel

É um site estático, sem build.

1. Envie a pasta `atendas-cs-discovery` para um repositório no GitHub.
2. No Vercel: **Add New → Project**, escolha o repositório.
3. Em **Framework Preset**, deixe **Other**. Não precisa de comando de build nem de pasta de saída.
4. Deploy. O endereço abre o `index.html`.

Se o protótipo não deve ficar público, ative a proteção por senha do projeto no Vercel (**Settings → Deployment Protection**) antes de compartilhar o link.

## Como as telas funcionam

Cada tela é um arquivo `.dc.html` com três partes:

- `<x-dc>`: o conteúdo da tela, com valores no formato `{{ nome }}`, repetições em `<sc-for>` e partes condicionais em `<sc-if>`;
- `<helmet>`: fontes e estilos que vão para o `<head>`;
- `<script type="text/x-dc">`: uma classe `Component` com o estado da tela e a função `renderVals()`, que devolve os valores usados no conteúdo.

O `support.js` lê essas três partes, desenha a tela e a redesenha a cada `setState`, preservando foco, rolagem e o que foi digitado. É um runtime pequeno, feito só para o protótipo funcionar fora do canvas: no portal de verdade, as telas serão reconstruídas no framework escolhido para o desenvolvimento, com os dados vindo do banco e das integrações.

## Navegação

- Os links e botões levam de uma tela a outra, como no modo Play do canvas.
- O `Mapa.dc.html` mostra os 10 caminhos principais (atender uma franquia, encontrar oportunidades, cancelamento, comunicação, POC, franquia nova, inadimplência, conteúdo e fechamento do mês).
- `Main.dc.html` é a Minha carteira no modo noite (padrão). `MainNoite.dc.html` é a referência do modo dia (o nome do arquivo ficou da versão anterior do canvas).

## Telas

| Grupo | Telas |
|---|---|
| Começo | Mapa de navegação |
| Dia a dia do CS | Minha carteira, Registrar atendimento, Ficha da franquia, Resumo da semana, Biblioteca, Upsell, Aderência aos produtos |
| Gestão | Configurações, Meta do time, Visão geral, Saúde da base, Alertas, Visão da diretoria |
| Modo dia (referência) | Minha carteira em modo dia |
| Acompanhamentos | Inadimplência, Comunicação, Projetos piloto, Registrar dados do projeto, Cancelamentos e retenção, Nova comunicação, Agenda das franqueadoras |
| Conteúdo | King Post, Atendas Vision, King Post (visão da gestão) |
| Acesso | Login e definição de senha |
| Operação do portal | Carga de franquias, Central de aprovações, Carteira geral, Onboarding, Notificações, Minha conta, Formulário da franquia (celular) |

## O que não está aqui

- Dados reais, login de verdade e integrações (Read AI, Yungas, Financeiro/Omie, Operações, time de API Oficial). As telas mostram onde cada dado entra; as fontes ainda serão definidas.
- Persistência: o que se digita ou marca no protótipo vale só enquanto a tela está aberta.
