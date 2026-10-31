# Bloco de Notas do Operador (demo)

Ferramenta web para operadores de monitoramento, criada por mim na rotina da **Technocel Gerenciamento de Risco** e adotada por cerca de 8 colegas da equipe como instrumento de trabalho.

Esta é uma **versão de demonstração, reescrita do zero**, com conteúdo fictício. Ela não contém dados, manuais, procedimentos, ramais ou nomes de clientes da empresa.

**Ver online:** https://hugohendrix.github.io/bloco-de-notas-demo/

![Captura de tela do Bloco de Notas do Operador](docs/captura-de-tela.jpg)

## Por que existe

Na equipe, as ocorrências sobre os motoristas eram registradas todos os dias, como a falta de sinal do veículo. Eu usava o bloco para personalizar as mensagens, copiar o texto e colar nos outros sistemas, e também para reunir conteúdo educativo para quem estava começando. Os colegas passaram a usar, e a ferramenta virou parte da rotina.

## Recursos

- **Anotações livres:** crie quantos blocos quiser, dê um título a cada um, salve automaticamente, copie e baixe em `.txt`.
- **Passagem de turno:** os campos montam o texto na hora, e você pode editar o resultado antes de copiar.
- **Mensagens:** modelos que você edita, cria e exclui, com busca e campos de veículo, local e horário (`{{veiculo}}`, `{{local}}`, `{{horario}}`) que preenchem o texto.
- **Conversor de coordenadas:** aceita ponto ou vírgula decimal, valida os valores, gera o formato de mapa e o de planilha e abre no mapa.
- **Tempo e distância:** tempo parado, distância em linha reta entre dois pontos e previsão de chegada.
- **Lembretes de contato:** temporizadores com aviso visual, sonoro e para leitores de tela, que continuam contando depois de recarregar a página.
- **Checklist do turno:** itens que você marca, adiciona e remove.
- **Guia para novatos:** primeiro turno, como registrar uma ocorrência, como falar com o motorista e glossário.
- **Alfabeto fonético da OTAN** e **código Q** com busca.
- Relógio e saudação, tema claro e escuro, menu lateral e botão de voltar ao topo.

## Decisões técnicas

- **HTML, CSS e JavaScript puros**, sem bibliotecas. A versão original usava Bootstrap, jQuery, Owl Carousel, AOS e Font Awesome.
- **Privacidade:** tudo roda no navegador e os dados ficam em `localStorage`. Nada é enviado a servidor algum.
- **Acessibilidade:** link para pular ao conteúdo, rótulos em todos os campos, foco visível, avisos para leitores de tela (`aria-live`), menu em gaveta com `Esc` e navegação completa pelo teclado.
- **Responsivo:** menu lateral fixo no desktop e gaveta no celular, testado a partir de 375 px, sem rolagem lateral.
- **Resiliente:** se o `localStorage` estiver bloqueado, a página avisa e continua funcionando. A cópia usa um plano B para navegadores sem a API de área de transferência.
- **SEO:** título e descrição próprios, Open Graph, Twitter Card, `canonical`, `robots.txt` e `sitemap.xml`.

## Como rodar

Não há etapa de build. Abra o `index.html` no navegador ou use um servidor local:

```bash
python -m http.server 8000
```

Depois acesse http://localhost:8000.

## Estrutura

```
index.html      página única com todas as seções
css/style.css   estilos, menu lateral e temas claro e escuro
js/script.js    anotações, mensagens, ferramentas de apoio e lembretes
img/            favicon e imagem de compartilhamento
```

## Autor

**Hugo Hendrix** · [Portfólio](https://hugohendrix.github.io/portfolio-hugo/) · [LinkedIn](https://www.linkedin.com/in/hugohendrix/) · [GitHub](https://github.com/HugoHendrix)
