'use strict';

/* =====================================================================
   Utilidades
   ===================================================================== */
const $ = (id) => document.getElementById(id);

function el(tag, props, ...filhos) {
    const no = document.createElement(tag);
    Object.entries(props || {}).forEach(([chave, valor]) => {
        if (chave === 'className') no.className = valor;
        else if (chave === 'text') no.textContent = valor;
        else if (chave.startsWith('on')) no.addEventListener(chave.slice(2).toLowerCase(), valor);
        else no.setAttribute(chave, valor);
    });
    filhos.forEach((f) => no.append(f));
    return no;
}

const memoria = {
    ler(chave, padrao) {
        try {
            const bruto = localStorage.getItem(chave);
            return bruto === null ? padrao : JSON.parse(bruto);
        } catch (e) {
            return padrao;
        }
    },
    gravar(chave, valor) {
        try {
            localStorage.setItem(chave, JSON.stringify(valor));
            return true;
        } catch (e) {
            return false;
        }
    },
    apagar(chave) {
        try {
            localStorage.removeItem(chave);
        } catch (e) { /* sem armazenamento: segue sem salvar */ }
    }
};

function avisar(status, mensagem) {
    if (!status) return;
    status.textContent = mensagem;
    clearTimeout(status._timer);
    status._timer = setTimeout(() => { status.textContent = ''; }, 2500);
}

async function copiarTexto(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        return true;
    } catch (e) {
        const temp = document.createElement('textarea');
        temp.value = texto;
        temp.setAttribute('readonly', '');
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.select();
        let ok = false;
        try {
            ok = document.execCommand('copy');
        } catch (err) { /* ignora */ }
        document.body.removeChild(temp);
        return ok;
    }
}

async function copiarCom(status, texto) {
    if (!texto.trim()) {
        avisar(status, 'Nada para copiar');
        return;
    }
    avisar(status, (await copiarTexto(texto)) ? 'Copiado!' : 'Não foi possível copiar');
}

const pad = (n) => String(n).padStart(2, '0');
const normaliza = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const formatarHora = (d) => pad(d.getHours()) + ':' + pad(d.getMinutes());

function formatarDuracao(minutos) {
    const total = Math.max(0, Math.round(minutos));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0) return m + ' min';
    return h + ' h ' + pad(m) + ' min';
}

/* =====================================================================
   Tema
   ===================================================================== */
(function tema() {
    const raiz = document.documentElement;
    const salvo = memoria.ler('tema', null);
    const claro = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const aplicar = (valor) => {
        raiz.dataset.theme = valor;
        document.querySelector('meta[name="theme-color"]').content = valor === 'dark' ? '#0c0b17' : '#f4f7fc';
    };
    aplicar(salvo || (claro ? 'light' : 'dark'));
    $('alternar-tema').addEventListener('click', () => {
        const novo = raiz.dataset.theme === 'dark' ? 'light' : 'dark';
        aplicar(novo);
        memoria.gravar('tema', novo);
    });
})();

/* =====================================================================
   Menu lateral (gaveta no celular) e seção atual
   ===================================================================== */
(function menu() {
    const botao = $('abrir-menu');
    const fundo = $('menu-fundo');
    const lateral = $('lateral');

    function definir(aberto) {
        document.body.classList.toggle('menu-aberto', aberto);
        botao.setAttribute('aria-expanded', String(aberto));
        botao.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
        fundo.hidden = !aberto;
        if (aberto) lateral.querySelector('a').focus();
        else botao.focus();
    }

    botao.addEventListener('click', () => definir(!document.body.classList.contains('menu-aberto')));
    fundo.addEventListener('click', () => definir(false));
    lateral.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
        if (document.body.classList.contains('menu-aberto')) {
            document.body.classList.remove('menu-aberto');
            botao.setAttribute('aria-expanded', 'false');
            fundo.hidden = true;
        }
    }));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('menu-aberto')) definir(false);
    });
    window.matchMedia('(min-width: 960px)').addEventListener('change', (e) => {
        if (e.matches && document.body.classList.contains('menu-aberto')) {
            document.body.classList.remove('menu-aberto');
            botao.setAttribute('aria-expanded', 'false');
            fundo.hidden = true;
        }
    });

    if (!('IntersectionObserver' in window)) return;
    const links = Array.from(lateral.querySelectorAll('a'));
    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
            if (!entrada.isIntersecting) return;
            links.forEach((a) => a.removeAttribute('aria-current'));
            const ativo = links.find((a) => a.getAttribute('href') === '#' + entrada.target.id);
            if (ativo) ativo.setAttribute('aria-current', 'true');
        });
    }, { rootMargin: '-25% 0px -65% 0px' });
    links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean).forEach((s) => observador.observe(s));
})();

/* =====================================================================
   Relógio e saudação
   ===================================================================== */
function atualizarRelogio() {
    const agora = new Date();
    const h = agora.getHours();
    const saudacao = h >= 5 && h < 12 ? 'Bom dia!' : h >= 12 && h < 18 ? 'Boa tarde!' : h >= 18 ? 'Boa noite!' : 'Boa madrugada!';
    $('hora').textContent = formatarHora(agora) + ':' + pad(agora.getSeconds());
    $('saudacao').textContent = saudacao;
    $('data').textContent = 'Hoje é ' + agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
atualizarRelogio();
setInterval(atualizarRelogio, 1000);

/* =====================================================================
   Anotações: blocos livres, com título, salvamento automático
   ===================================================================== */
const NOTAS_PADRAO = [
    { id: 'n-turno', titulo: 'Anotações do turno', texto: '' },
    { id: 'n-geral', titulo: 'Anotações gerais', texto: '' }
];
let notas = memoria.ler('notas:v1', null) || NOTAS_PADRAO.map((n) => Object.assign({}, n));
const statusNotas = $('status-notas');

function salvarNotas() {
    const ok = memoria.gravar('notas:v1', notas);
    avisar(statusNotas, ok ? 'Salvo às ' + formatarHora(new Date()) : 'Não foi possível salvar neste navegador');
    atualizarResumos();
}

function desenharNotas() {
    const lista = $('lista-notas');
    lista.textContent = '';
    notas.forEach((nota) => {
        const idTitulo = 'nt-' + nota.id;
        const idTexto = 'nx-' + nota.id;
        const status = el('span', { className: 'status', role: 'status', 'aria-live': 'polite' });

        const titulo = el('input', { type: 'text', id: idTitulo, className: 'titulo-nota', value: nota.titulo, maxlength: '60', 'aria-label': 'Título do bloco' });
        titulo.addEventListener('input', () => { nota.titulo = titulo.value; salvarNotas(); });

        const area = el('textarea', { id: idTexto, rows: '9', placeholder: 'Escreva o que precisar...', 'aria-label': 'Texto do bloco ' + nota.titulo });
        area.value = nota.texto;
        let espera;
        area.addEventListener('input', () => {
            nota.texto = area.value;
            clearTimeout(espera);
            espera = setTimeout(salvarNotas, 400);
        });

        const copiar = el('button', { type: 'button', className: 'btn', text: 'Copiar' });
        copiar.addEventListener('click', () => copiarCom(status, area.value));

        const baixar = el('button', { type: 'button', className: 'btn btn-sec', text: 'Baixar .txt' });
        baixar.addEventListener('click', () => {
            if (!area.value) {
                avisar(status, 'Nada para baixar');
                return;
            }
            const arquivo = new Blob([area.value], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(arquivo);
            link.download = (normaliza(titulo.value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'anotacao') + '.txt';
            link.click();
            URL.revokeObjectURL(link.href);
            avisar(status, 'Arquivo gerado');
        });

        const limpar = el('button', { type: 'button', className: 'btn btn-sec', text: 'Limpar' });
        limpar.addEventListener('click', () => {
            if (!area.value || !window.confirm('Apagar o texto deste bloco?')) return;
            area.value = '';
            nota.texto = '';
            salvarNotas();
            area.focus();
        });

        const excluir = el('button', { type: 'button', className: 'btn btn-sec btn-perigo', text: 'Excluir bloco' });
        excluir.addEventListener('click', () => {
            if (!window.confirm('Excluir o bloco "' + (nota.titulo || 'sem título') + '"?')) return;
            notas = notas.filter((n) => n.id !== nota.id);
            salvarNotas();
            desenharNotas();
            $('nova-nota').focus();
        });

        lista.appendChild(el('div', { className: 'bloco-nota' },
            titulo, area, el('div', { className: 'acoes' }, copiar, baixar, limpar, excluir, status)));
    });
}

$('nova-nota').addEventListener('click', () => {
    notas.push({ id: novoId(), titulo: 'Novo bloco', texto: '' });
    salvarNotas();
    desenharNotas();
    const campos = $('lista-notas').querySelectorAll('.titulo-nota');
    const ultimo = campos[campos.length - 1];
    ultimo.focus();
    ultimo.select();
});
desenharNotas();

/* =====================================================================
   Passagem de turno
   ===================================================================== */
const SISTEMAS = {
    a: { nome: 'Sistema A', resposta: 'palavra combinada do dia' },
    b: { nome: 'Sistema B', resposta: 'data do dia' },
    c: { nome: 'Sistema C', resposta: 'resposta negativa' }
};
let passagemEditada = false;

function montarPassagem(forcar) {
    if (passagemEditada && !forcar) return;
    const sistema = SISTEMAS[$('pt-sistema').value];
    const operador = $('pt-operador').value.trim() || '(nome do operador)';
    const pendencias = $('pt-pendencias').value.split('\n').map((l) => l.trim()).filter(Boolean);
    const lista = pendencias.length ? pendencias.map((p) => '- ' + p).join('\n') : '- Nenhuma pendência';
    $('pt-saida').value =
        '📣 PASSAGEM DE TURNO\n' +
        'Data: ' + new Date().toLocaleDateString('pt-BR') + '\n' +
        'Operador: ' + operador + '\n' +
        'Turno: ' + $('pt-turno').value + '\n' +
        'Sistema: ' + sistema.nome + '\n\n' +
        'Pendências:\n' + lista + '\n\n' +
        'Resposta de segurança neste sistema: ' + sistema.resposta + '.';
}

['pt-operador', 'pt-turno', 'pt-sistema', 'pt-pendencias'].forEach((id) => {
    $(id).addEventListener('input', () => montarPassagem(false));
    $(id).addEventListener('change', () => montarPassagem(false));
});
$('pt-operador').value = memoria.ler('pt:operador', '');
$('pt-operador').addEventListener('input', () => memoria.gravar('pt:operador', $('pt-operador').value));
$('pt-saida').addEventListener('input', () => {
    passagemEditada = true;
    avisar($('pt-status'), 'Texto editado. Use "Refazer" para recomeçar dos campos.');
});
$('pt-refazer').addEventListener('click', () => {
    passagemEditada = false;
    montarPassagem(true);
    avisar($('pt-status'), 'Texto refeito');
});
$('pt-copiar').addEventListener('click', () => copiarCom($('pt-status'), $('pt-saida').value));
montarPassagem(true);

/* =====================================================================
   Mensagens: modelos editáveis, com campos e busca
   ===================================================================== */
const MENSAGENS_PADRAO = [
    { id: 'm1', categoria: 'Viagem', titulo: 'Início de viagem não informado', texto: 'Bom dia! Aqui é da central de monitoramento. Identificamos que o veículo {{veiculo}} saiu às {{horario}} sem informar o início da viagem. Poderia confirmar o início e o destino, por favor?' },
    { id: 'm2', categoria: 'Parada', titulo: 'Parada fora do ponto previsto', texto: 'Identificamos o veículo {{veiculo}} parado em {{local}} desde as {{horario}}, fora dos pontos previstos. Está tudo bem? Poderia informar o motivo da parada?' },
    { id: 'm3', categoria: 'Equipamento', titulo: 'Sem sinal do equipamento', texto: 'O veículo {{veiculo}} está sem sinal do rastreador desde as {{horario}}, última posição em {{local}}. Vamos acompanhar e tentar contato. Caso perceba algo no painel, pedimos que nos avise.' },
    { id: 'm4', categoria: 'Rota', titulo: 'Desvio de rota', texto: 'O veículo {{veiculo}} saiu da rota prevista às {{horario}}, próximo a {{local}}. Poderia confirmar se houve alteração autorizada no trajeto?' },
    { id: 'm5', categoria: 'Segurança', titulo: 'Velocidade acima do limite', texto: 'Registramos velocidade acima do limite no veículo {{veiculo}} às {{horario}}, em {{local}}. Pedimos atenção e redução da velocidade. Obrigado pela colaboração!' },
    { id: 'm6', categoria: 'Parada', titulo: 'Tempo de parada excedido', texto: 'O veículo {{veiculo}} permanece parado em {{local}} desde as {{horario}}, acima do tempo previsto. Poderia informar quando pretende retomar a viagem?' },
    { id: 'm7', categoria: 'Contato', titulo: 'Contato sem resposta', texto: 'Tentamos contato com o veículo {{veiculo}} às {{horario}} e não obtivemos resposta. Pedimos que retorne assim que possível. Seguimos acompanhando a posição em {{local}}.' },
    { id: 'm8', categoria: 'Contato', titulo: 'Encerramento da ocorrência', texto: 'Ocorrência do veículo {{veiculo}} encerrada às {{horario}}. Situação regularizada em {{local}}. Agradecemos o retorno e desejamos uma boa viagem!' }
];
let mensagens = memoria.ler('mensagens:v1', null) || MENSAGENS_PADRAO.map((m) => Object.assign({}, m));
let editandoMensagem = null;

function salvarMensagens() {
    memoria.gravar('mensagens:v1', mensagens);
    atualizarResumos();
}

function preencher(texto) {
    const dados = {
        veiculo: $('m-veiculo').value.trim() || '[veículo]',
        local: $('m-local').value.trim() || '[local]',
        horario: $('m-horario').value || '[horário]'
    };
    return texto.replace(/\{\{(\w+)\}\}/g, (inteiro, chave) => (chave in dados ? dados[chave] : inteiro));
}

function desenharMensagens() {
    const termo = normaliza($('m-busca').value.trim());
    const lista = $('lista-mensagens');
    lista.textContent = '';
    let exibidas = 0;

    mensagens.forEach((m) => {
        if (termo && !normaliza(m.titulo + ' ' + m.categoria + ' ' + m.texto).includes(termo)) return;
        exibidas++;
        const card = el('article', { className: 'card' });

        if (editandoMensagem === m.id) {
            const titulo = el('input', { type: 'text', value: m.titulo, maxlength: '80', 'aria-label': 'Título da mensagem' });
            const area = el('textarea', { rows: '5', 'aria-label': 'Texto da mensagem' });
            area.value = m.texto;
            const salvar = el('button', { type: 'button', className: 'btn btn-pequeno', text: 'Salvar' });
            salvar.addEventListener('click', () => {
                if (!titulo.value.trim() || !area.value.trim()) return;
                m.titulo = titulo.value.trim();
                m.texto = area.value.trim();
                editandoMensagem = null;
                salvarMensagens();
                desenharMensagens();
            });
            const cancelar = el('button', { type: 'button', className: 'btn btn-sec btn-pequeno', text: 'Cancelar' });
            cancelar.addEventListener('click', () => { editandoMensagem = null; desenharMensagens(); });
            card.append(el('span', { className: 'categoria', text: m.categoria }), titulo, area,
                el('div', { className: 'acoes' }, salvar, cancelar));
            lista.appendChild(card);
            return;
        }

        const status = el('span', { className: 'status', role: 'status', 'aria-live': 'polite' });
        const texto = el('p', { text: preencher(m.texto) });
        const copiar = el('button', { type: 'button', className: 'btn btn-pequeno', text: 'Copiar', 'aria-label': 'Copiar mensagem: ' + m.titulo });
        copiar.addEventListener('click', () => copiarCom(status, texto.textContent));
        const editar = el('button', { type: 'button', className: 'btn btn-sec btn-pequeno', text: 'Editar', 'aria-label': 'Editar mensagem: ' + m.titulo });
        editar.addEventListener('click', () => { editandoMensagem = m.id; desenharMensagens(); });
        const excluir = el('button', { type: 'button', className: 'btn btn-sec btn-pequeno btn-perigo', text: 'Excluir', 'aria-label': 'Excluir mensagem: ' + m.titulo });
        excluir.addEventListener('click', () => {
            if (!window.confirm('Excluir a mensagem "' + m.titulo + '"?')) return;
            mensagens = mensagens.filter((x) => x.id !== m.id);
            salvarMensagens();
            desenharMensagens();
        });
        card.append(el('span', { className: 'categoria', text: m.categoria }), el('h3', { text: m.titulo }), texto,
            el('div', { className: 'acoes' }, copiar, editar, excluir, status));
        lista.appendChild(card);
    });

    $('m-contagem').textContent = exibidas === 0
        ? 'Nenhuma mensagem encontrada.'
        : exibidas + (exibidas === 1 ? ' mensagem encontrada.' : ' mensagens encontradas.');
}

['m-veiculo', 'm-local', 'm-horario', 'm-busca'].forEach((id) => $(id).addEventListener('input', desenharMensagens));
$('m-horario').value = formatarHora(new Date());

$('m-form').addEventListener('submit', () => {
    const titulo = $('mn-titulo').value.trim();
    const texto = $('mn-texto').value.trim();
    if (!titulo || !texto) return;
    mensagens.unshift({ id: novoId(), categoria: 'Minhas', titulo, texto });
    salvarMensagens();
    $('m-form').reset();
    $('m-nova').open = false;
    $('m-busca').value = '';
    desenharMensagens();
    $('m-contagem').textContent = 'Mensagem criada.';
});

$('m-restaurar').addEventListener('click', () => {
    if (!window.confirm('Restaurar as mensagens padrão? As alterações e as mensagens criadas por você serão apagadas.')) return;
    mensagens = MENSAGENS_PADRAO.map((m) => Object.assign({}, m));
    editandoMensagem = null;
    salvarMensagens();
    desenharMensagens();
});
desenharMensagens();

/* =====================================================================
   Coordenadas
   ===================================================================== */
function lerCoordenadas(texto) {
    const numeros = texto.match(/-?\d+(?:[.,]\d+)?/g);
    if (!numeros || numeros.length !== 2) {
        return { erro: 'Informe exatamente dois números: latitude e longitude.' };
    }
    const [lat, lon] = numeros.map((n) => parseFloat(n.replace(',', '.')));
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        return { erro: 'Valores fora do intervalo: latitude vai de -90 a 90 e longitude de -180 a 180.' };
    }
    return { lat, lon };
}

function converterCoordenadas() {
    const bruto = $('c-entrada').value.trim();
    const abrir = $('c-abrir');
    $('c-mapa').value = '';
    $('c-planilha').value = '';
    $('c-erro').textContent = '';
    abrir.setAttribute('aria-disabled', 'true');
    abrir.href = '#coordenadas';
    if (!bruto) return;

    const r = lerCoordenadas(bruto);
    if (r.erro) {
        $('c-erro').textContent = r.erro;
        return;
    }
    $('c-mapa').value = r.lat + ', ' + r.lon;
    $('c-planilha').value = String(r.lat).replace('.', ',') + ';' + String(r.lon).replace('.', ',');
    abrir.href = 'https://www.google.com/maps?q=' + encodeURIComponent(r.lat + ',' + r.lon);
    abrir.removeAttribute('aria-disabled');
}
$('c-entrada').addEventListener('input', converterCoordenadas);
$('c-copiar-mapa').addEventListener('click', () => copiarCom($('c-status'), $('c-mapa').value));
$('c-copiar-planilha').addEventListener('click', () => copiarCom($('c-status'), $('c-planilha').value));

/* =====================================================================
   Tempo e distância
   ===================================================================== */
function atualizarTempoParado() {
    const valor = $('tp-desde').value;
    const saida = $('tp-resultado');
    if (!valor) {
        saida.textContent = 'Informe o horário.';
        return;
    }
    const [h, m] = valor.split(':').map(Number);
    const agora = new Date();
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), h, m);
    let minutos = (agora - inicio) / 60000;
    let ontem = false;
    if (minutos < 0) {
        minutos += 24 * 60;
        ontem = true;
    }
    saida.textContent = 'Parado há ' + formatarDuracao(minutos) + (ontem ? ' (desde ontem)' : '') + '.';
}
$('tp-desde').addEventListener('input', atualizarTempoParado);
setInterval(atualizarTempoParado, 30000);

let kmManual = false;
function calcularDistancia() {
    const saida = $('d-resultado');
    const a = $('d-a').value.trim();
    const b = $('d-b').value.trim();
    if (!a || !b) {
        saida.textContent = 'Informe os dois pontos.';
        return;
    }
    const p1 = lerCoordenadas(a);
    const p2 = lerCoordenadas(b);
    if (p1.erro || p2.erro) {
        saida.textContent = 'Confira as coordenadas: ' + (p1.erro || p2.erro);
        return;
    }
    const rad = (g) => g * Math.PI / 180;
    const dLat = rad(p2.lat - p1.lat);
    const dLon = rad(p2.lon - p1.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(p1.lat)) * Math.cos(rad(p2.lat)) * Math.sin(dLon / 2) ** 2;
    const km = 6371 * 2 * Math.asin(Math.sqrt(h));
    saida.textContent = 'Distância em linha reta: ' + km.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' km.';
    if (!kmManual) {
        $('e-km').value = km.toFixed(1);
        calcularChegada();
    }
}
$('d-a').addEventListener('input', calcularDistancia);
$('d-b').addEventListener('input', calcularDistancia);

function calcularChegada() {
    const saida = $('e-resultado');
    const km = parseFloat($('e-km').value);
    const vel = parseFloat($('e-vel').value);
    if (!(km >= 0) || !(vel > 0)) {
        saida.textContent = 'Informe a distância e a velocidade.';
        return;
    }
    const minutos = km / vel * 60;
    const chegada = new Date(Date.now() + minutos * 60000);
    const outroDia = chegada.toDateString() !== new Date().toDateString();
    saida.textContent = 'Tempo estimado: ' + formatarDuracao(minutos) + '. Chegada por volta das ' + formatarHora(chegada) + (outroDia ? ' (outro dia)' : '') + '.';
}
$('e-km').addEventListener('input', () => { kmManual = true; calcularChegada(); });
$('e-vel').addEventListener('input', calcularChegada);

const CHECKLIST_PADRAO = [
    { id: 'c1', texto: 'Ler a passagem de turno anterior', feito: false },
    { id: 'c2', texto: 'Conferir o sistema de rastreamento e o telefone', feito: false },
    { id: 'c3', texto: 'Revisar ocorrências em aberto', feito: false },
    { id: 'c4', texto: 'Verificar veículos sem sinal', feito: false },
    { id: 'c5', texto: 'Registrar a passagem de turno', feito: false }
];
let checklist = memoria.ler('checklist:v1', null) || CHECKLIST_PADRAO.map((i) => Object.assign({}, i));

/* =====================================================================
   Lembretes de contato
   ===================================================================== */
let lembretes = memoria.ler('lembretes:v1', []);
let contextoAudio = null;
const tituloOriginal = document.title;

function salvarLembretes() {
    memoria.gravar('lembretes:v1', lembretes);
    atualizarResumos();
}

function tocarAviso() {
    try {
        contextoAudio = contextoAudio || new (window.AudioContext || window.webkitAudioContext)();
        [0, 0.35, 0.7].forEach((atraso) => {
            const osc = contextoAudio.createOscillator();
            const ganho = contextoAudio.createGain();
            osc.frequency.value = 880;
            ganho.gain.value = 0.15;
            osc.connect(ganho);
            ganho.connect(contextoAudio.destination);
            osc.start(contextoAudio.currentTime + atraso);
            osc.stop(contextoAudio.currentTime + atraso + 0.2);
        });
    } catch (e) { /* sem áudio: o aviso visual continua */ }
}

function desenharLembretes() {
    const lista = $('lista-lembretes');
    lista.textContent = '';
    lembretes.forEach((l) => {
        const tempo = el('span', { className: 'tempo' });
        l.tempoEl = tempo;
        const item = el('li', { className: 'lembrete', 'data-id': l.id });
        const dispensar = el('button', { type: 'button', className: 'btn btn-sec btn-pequeno', text: 'Dispensar', 'aria-label': 'Dispensar lembrete: ' + l.texto });
        dispensar.addEventListener('click', () => {
            lembretes = lembretes.filter((x) => x.id !== l.id);
            salvarLembretes();
            desenharLembretes();
        });
        item.append(el('span', { className: 'lembrete-texto', text: l.texto }), tempo, dispensar);
        lista.appendChild(item);
    });
    $('l-vazio').hidden = lembretes.length > 0;
    atualizarContagemLembretes();
}

function atualizarContagemLembretes() {
    const agora = Date.now();
    let algumVencido = false;
    lembretes.forEach((l) => {
        const restante = l.fim - agora;
        const item = document.querySelector('.lembrete[data-id="' + l.id + '"]');
        if (!item || !l.tempoEl) return;
        if (restante <= 0) {
            item.classList.add('vencido');
            l.tempoEl.textContent = 'Tempo esgotado';
            algumVencido = true;
            if (!l.avisado) {
                l.avisado = true;
                tocarAviso();
                $('l-alerta').textContent = 'Lembrete: ' + l.texto;
            }
        } else {
            const total = Math.ceil(restante / 1000);
            l.tempoEl.textContent = pad(Math.floor(total / 60)) + ':' + pad(total % 60);
        }
    });
    document.title = algumVencido ? '⏰ Lembrete! ' + tituloOriginal : tituloOriginal;
    atualizarResumos();
}

$('l-form').addEventListener('submit', () => {
    const texto = $('l-texto').value.trim();
    const minutos = parseInt($('l-min').value, 10);
    if (!texto || !(minutos >= 1)) return;
    tocarAvisoSilencioso();
    lembretes.push({ id: novoId(), texto, fim: Date.now() + minutos * 60000 });
    salvarLembretes();
    $('l-texto').value = '';
    $('l-texto').focus();
    desenharLembretes();
});

/* o navegador só libera áudio depois de uma ação do usuário; criar o contexto aqui garante o alarme depois */
function tocarAvisoSilencioso() {
    try {
        contextoAudio = contextoAudio || new (window.AudioContext || window.webkitAudioContext)();
        if (contextoAudio.state === 'suspended') contextoAudio.resume();
    } catch (e) { /* ignora */ }
}

desenharLembretes();
setInterval(atualizarContagemLembretes, 1000);

/* =====================================================================
   Checklist do turno
   ===================================================================== */


function salvarChecklist() {
    memoria.gravar('checklist:v1', checklist);
    atualizarProgressoChecklist();
}

function atualizarProgressoChecklist() {
    const feitos = checklist.filter((i) => i.feito).length;
    $('ck-progresso').textContent = checklist.length
        ? feitos + ' de ' + checklist.length + ' itens concluídos.'
        : 'Nenhum item no checklist.';
    atualizarResumos();
}

function desenharChecklist() {
    const lista = $('lista-checklist');
    lista.textContent = '';
    checklist.forEach((item) => {
        const caixa = el('input', { type: 'checkbox', id: 'ck-' + item.id });
        caixa.checked = item.feito;
        const rotulo = el('label', { for: 'ck-' + item.id, text: item.texto });
        const linha = el('li', { className: 'item-checklist' + (item.feito ? ' feito' : '') });
        caixa.addEventListener('change', () => {
            item.feito = caixa.checked;
            linha.classList.toggle('feito', item.feito);
            salvarChecklist();
        });
        const remover = el('button', { type: 'button', className: 'btn btn-sec btn-pequeno btn-perigo', text: 'Remover', 'aria-label': 'Remover item: ' + item.texto });
        remover.addEventListener('click', () => {
            checklist = checklist.filter((i) => i.id !== item.id);
            salvarChecklist();
            desenharChecklist();
        });
        linha.append(caixa, rotulo, remover);
        lista.appendChild(linha);
    });
    atualizarProgressoChecklist();
}

$('ck-form').addEventListener('submit', () => {
    const texto = $('ck-novo').value.trim();
    if (!texto) return;
    checklist.push({ id: novoId(), texto, feito: false });
    salvarChecklist();
    $('ck-novo').value = '';
    desenharChecklist();
    $('ck-novo').focus();
});
$('ck-reiniciar').addEventListener('click', () => {
    checklist.forEach((i) => { i.feito = false; });
    salvarChecklist();
    desenharChecklist();
});
desenharChecklist();

/* =====================================================================
   Resumo da página inicial
   ===================================================================== */
function atualizarResumos() {
    const caracteres = notas.reduce((soma, n) => soma + n.texto.length, 0);
    $('resumo-notas').textContent = caracteres.toLocaleString('pt-BR');
    $('resumo-mensagens').textContent = mensagens.length;
    $('resumo-checklist').textContent = checklist.filter((i) => i.feito).length + ' de ' + checklist.length;
    $('resumo-lembretes').textContent = lembretes.filter((l) => l.fim > Date.now()).length;
}
atualizarResumos();

/* =====================================================================
   Alfabeto fonético
   ===================================================================== */
const FONETICO = {
    A: 'Alfa', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot', G: 'Golf', H: 'Hotel',
    I: 'India', J: 'Juliett', K: 'Kilo', L: 'Lima', M: 'Mike', N: 'November', O: 'Oscar', P: 'Papa',
    Q: 'Quebec', R: 'Romeo', S: 'Sierra', T: 'Tango', U: 'Uniform', V: 'Victor', W: 'Whiskey',
    X: 'X-ray', Y: 'Yankee', Z: 'Zulu',
    0: 'Zero', 1: 'Um', 2: 'Dois', 3: 'Três', 4: 'Quatro', 5: 'Cinco', 6: 'Seis', 7: 'Sete', 8: 'Oito', 9: 'Nove'
};

Object.keys(FONETICO).forEach((letra) => {
    $('f-tabela').appendChild(el('li', {}, el('strong', { text: letra }), ' ' + FONETICO[letra]));
});

$('f-entrada').addEventListener('input', () => {
    const caracteres = normaliza($('f-entrada').value).toUpperCase().replace(/[^A-Z0-9]/g, '').split('');
    $('f-saida').textContent = caracteres.map((c) => FONETICO[c]).join(' - ');
});
$('f-copiar').addEventListener('click', () => copiarCom($('f-status'), $('f-saida').textContent));

/* =====================================================================
   Código Q
   ===================================================================== */
const CODIGOS_Q = [
    ['QAP', 'Estou na escuta (permaneça na escuta).'],
    ['QRA', 'Nome da estação ou do operador.'],
    ['QRG', 'Frequência exata.'],
    ['QRL', 'Estou ocupado. A frequência está em uso?'],
    ['QRM', 'Interferência de outras estações.'],
    ['QRN', 'Ruído atmosférico (estática).'],
    ['QRO', 'Aumentar a potência.'],
    ['QRP', 'Diminuir a potência.'],
    ['QRT', 'Encerrar a transmissão.'],
    ['QRU', 'Não tenho nada para você. Você tem algo para mim?'],
    ['QRV', 'Estou pronto.'],
    ['QRX', 'Aguarde, chamarei novamente.'],
    ['QRZ', 'Quem está me chamando?'],
    ['QSA', 'Intensidade do sinal.'],
    ['QSL', 'Confirmo o recebimento.'],
    ['QSO', 'Comunicação direta entre duas estações.'],
    ['QSY', 'Mudar de frequência.'],
    ['QTH', 'Localização (posição).'],
    ['QTR', 'Hora certa.']
];

function desenharCodigosQ() {
    const termo = normaliza($('q-busca').value.trim());
    const corpo = $('q-corpo');
    corpo.textContent = '';
    let exibidos = 0;
    CODIGOS_Q.forEach(([codigo, significado]) => {
        if (termo && !normaliza(codigo + ' ' + significado).includes(termo)) return;
        exibidos++;
        corpo.appendChild(el('tr', {}, el('td', { text: codigo }), el('td', { text: significado })));
    });
    $('q-contagem').textContent = exibidos === 0
        ? 'Nenhum código encontrado.'
        : exibidos + (exibidos === 1 ? ' código encontrado.' : ' códigos encontrados.');
}
$('q-busca').addEventListener('input', desenharCodigosQ);
desenharCodigosQ();

/* =====================================================================
   Voltar ao topo
   ===================================================================== */
const botaoTopo = $('voltar-topo');
window.addEventListener('scroll', () => { botaoTopo.hidden = window.scrollY < 400; }, { passive: true });
botaoTopo.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
