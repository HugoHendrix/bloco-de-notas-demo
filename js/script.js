'use strict';

/* ---------- utilidades ---------- */
const $ = (id) => document.getElementById(id);

const memoria = {
    ler(chave) {
        try {
            return localStorage.getItem(chave);
        } catch (e) {
            return null;
        }
    },
    gravar(chave, valor) {
        try {
            localStorage.setItem(chave, valor);
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

function avisar(idOrigem, mensagem) {
    const status = document.querySelector('[data-status-de="' + idOrigem + '"]');
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

const pad = (n) => String(n).padStart(2, '0');

const normaliza = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ---------- tema ---------- */
(function tema() {
    const raiz = document.documentElement;
    const salvo = memoria.ler('tema');
    const claro = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    raiz.dataset.theme = salvo || (claro ? 'light' : 'dark');
    $('alternar-tema').addEventListener('click', () => {
        const novo = raiz.dataset.theme === 'dark' ? 'light' : 'dark';
        raiz.dataset.theme = novo;
        memoria.gravar('tema', novo);
        document.querySelector('meta[name="theme-color"]').content = novo === 'dark' ? '#0c0b17' : '#f4f7fc';
    });
})();

/* ---------- relógio e saudação ---------- */
function atualizarRelogio() {
    const agora = new Date();
    const h = agora.getHours();
    const saudacao = h >= 5 && h < 12 ? 'Bom dia!' : h >= 12 && h < 18 ? 'Boa tarde!' : h >= 18 ? 'Boa noite!' : 'Boa madrugada!';
    $('hora').textContent = pad(h) + ':' + pad(agora.getMinutes()) + ':' + pad(agora.getSeconds());
    $('saudacao').textContent = saudacao;
    $('data').textContent = 'Hoje é ' + agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
atualizarRelogio();
setInterval(atualizarRelogio, 1000);

/* ---------- anotações com salvamento automático ---------- */
function atualizarResumoNotas() {
    const total = Array.from(document.querySelectorAll('[data-nota]')).reduce((soma, t) => soma + t.value.length, 0);
    $('resumo-notas').textContent = total.toLocaleString('pt-BR');
}

document.querySelectorAll('[data-nota]').forEach((area) => {
    area.value = memoria.ler('nota:' + area.id) || '';
    let espera;
    area.addEventListener('input', () => {
        clearTimeout(espera);
        espera = setTimeout(() => {
            const ok = memoria.gravar('nota:' + area.id, area.value);
            const agora = new Date();
            avisar(area.id, ok ? 'Salvo às ' + pad(agora.getHours()) + ':' + pad(agora.getMinutes()) : 'Não foi possível salvar neste navegador');
            atualizarResumoNotas();
        }, 400);
    });
});
atualizarResumoNotas();

document.querySelectorAll('[data-limpar]').forEach((botao) => {
    botao.addEventListener('click', () => {
        const id = botao.dataset.limpar;
        const area = $(id);
        if (!area.value || !window.confirm('Apagar todo o texto deste bloco?')) return;
        area.value = '';
        memoria.apagar('nota:' + id);
        atualizarResumoNotas();
        avisar(id, 'Bloco limpo');
        area.focus();
    });
});

document.querySelectorAll('[data-baixar]').forEach((botao) => {
    botao.addEventListener('click', () => {
        const id = botao.dataset.baixar;
        const texto = $(id).value;
        if (!texto) {
            avisar(id, 'Nada para baixar');
            return;
        }
        const arquivo = new Blob([texto], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(arquivo);
        link.download = id + '-' + new Date().toISOString().slice(0, 10) + '.txt';
        link.click();
        URL.revokeObjectURL(link.href);
        avisar(id, 'Arquivo gerado');
    });
});

/* ---------- copiar (botões genéricos) ---------- */
document.querySelectorAll('[data-copiar-de]').forEach((botao) => {
    botao.addEventListener('click', async () => {
        const id = botao.dataset.copiarDe;
        const campo = $(id);
        const texto = campo.value !== undefined && campo.tagName !== 'P' ? campo.value : campo.textContent;
        if (!texto.trim()) {
            avisar(id, 'Nada para copiar');
            return;
        }
        avisar(id, (await copiarTexto(texto)) ? 'Copiado!' : 'Não foi possível copiar');
    });
});

/* ---------- passagem de turno ---------- */
const SISTEMAS = {
    a: { nome: 'Sistema A', resposta: 'palavra combinada do dia' },
    b: { nome: 'Sistema B', resposta: 'data do dia' },
    c: { nome: 'Sistema C', resposta: 'resposta negativa' }
};

function montarPassagem() {
    const sistema = SISTEMAS[$('pt-sistema').value];
    const operador = $('pt-operador').value.trim() || '(nome do operador)';
    const pendencias = $('pt-pendencias').value
        .split('\n')
        .map((linha) => linha.trim())
        .filter(Boolean);
    const lista = pendencias.length ? pendencias.map((p) => '- ' + p).join('\n') : '- Nenhuma pendência';
    const hoje = new Date().toLocaleDateString('pt-BR');

    $('pt-saida').value =
        '📣 PASSAGEM DE TURNO\n' +
        'Data: ' + hoje + '\n' +
        'Operador: ' + operador + '\n' +
        'Turno: ' + $('pt-turno').value + '\n' +
        'Sistema: ' + sistema.nome + '\n\n' +
        'Pendências:\n' + lista + '\n\n' +
        'Resposta de segurança neste sistema: ' + sistema.resposta + '.';
}

['pt-operador', 'pt-turno', 'pt-sistema', 'pt-pendencias'].forEach((id) => {
    $(id).addEventListener('input', montarPassagem);
    $(id).addEventListener('change', montarPassagem);
});
$('pt-operador').value = memoria.ler('pt-operador') || '';
$('pt-operador').addEventListener('input', () => memoria.gravar('pt-operador', $('pt-operador').value));
montarPassagem();

/* ---------- mensagens padrão ---------- */
const MENSAGENS = [
    {
        titulo: 'Início de viagem não informado',
        categoria: 'Viagem',
        texto: 'Bom dia! Aqui é da central de monitoramento. Identificamos que o veículo {{veiculo}} saiu às {{horario}} sem informar o início da viagem. Poderia confirmar o início e o destino, por favor?'
    },
    {
        titulo: 'Parada fora do ponto previsto',
        categoria: 'Parada',
        texto: 'Identificamos o veículo {{veiculo}} parado em {{local}} desde as {{horario}}, fora dos pontos previstos. Está tudo bem? Poderia informar o motivo da parada?'
    },
    {
        titulo: 'Sem sinal do equipamento',
        categoria: 'Equipamento',
        texto: 'O veículo {{veiculo}} está sem sinal do rastreador desde as {{horario}}, última posição em {{local}}. Vamos acompanhar e tentar contato. Caso perceba algo no painel, pedimos que nos avise.'
    },
    {
        titulo: 'Desvio de rota',
        categoria: 'Rota',
        texto: 'O veículo {{veiculo}} saiu da rota prevista às {{horario}}, próximo a {{local}}. Poderia confirmar se houve alteração autorizada no trajeto?'
    },
    {
        titulo: 'Velocidade acima do limite',
        categoria: 'Segurança',
        texto: 'Registramos velocidade acima do limite no veículo {{veiculo}} às {{horario}}, em {{local}}. Pedimos atenção e redução da velocidade. Obrigado pela colaboração!'
    },
    {
        titulo: 'Tempo de parada excedido',
        categoria: 'Parada',
        texto: 'O veículo {{veiculo}} permanece parado em {{local}} desde as {{horario}}, acima do tempo previsto. Poderia informar quando pretende retomar a viagem?'
    },
    {
        titulo: 'Contato sem resposta',
        categoria: 'Contato',
        texto: 'Tentamos contato com o veículo {{veiculo}} às {{horario}} e não obtivemos resposta. Pedimos que retorne assim que possível. Seguimos acompanhando a posição em {{local}}.'
    },
    {
        titulo: 'Encerramento da ocorrência',
        categoria: 'Contato',
        texto: 'Ocorrência do veículo {{veiculo}} encerrada às {{horario}}. Situação regularizada em {{local}}. Agradecemos o retorno e desejamos uma boa viagem!'
    }
];

function preencher(texto) {
    const dados = {
        veiculo: $('m-veiculo').value.trim() || '[veículo]',
        local: $('m-local').value.trim() || '[local]',
        horario: $('m-horario').value || '[horário]'
    };
    return texto.replace(/\{\{(\w+)\}\}/g, (_, chave) => dados[chave]);
}

function desenharMensagens() {
    const termo = normaliza($('m-busca').value.trim());
    const lista = $('lista-mensagens');
    lista.textContent = '';
    let exibidas = 0;

    MENSAGENS.forEach((m, i) => {
        if (termo && !normaliza(m.titulo + ' ' + m.categoria + ' ' + m.texto).includes(termo)) return;
        exibidas++;
        const card = document.createElement('article');
        card.className = 'card';

        const categoria = document.createElement('span');
        categoria.className = 'categoria';
        categoria.textContent = m.categoria;

        const titulo = document.createElement('h3');
        titulo.textContent = m.titulo;

        const texto = document.createElement('p');
        texto.textContent = preencher(m.texto);
        texto.id = 'msg-texto-' + i;

        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'btn';
        botao.textContent = 'Copiar mensagem';
        botao.setAttribute('aria-label', 'Copiar mensagem: ' + m.titulo);
        botao.addEventListener('click', async () => {
            const ok = await copiarTexto(texto.textContent);
            botao.textContent = ok ? 'Copiado!' : 'Falhou';
            setTimeout(() => { botao.textContent = 'Copiar mensagem'; }, 1800);
        });

        card.append(categoria, titulo, texto, botao);
        lista.appendChild(card);
    });

    $('m-contagem').textContent = exibidas === 0
        ? 'Nenhuma mensagem encontrada.'
        : exibidas + (exibidas === 1 ? ' mensagem encontrada.' : ' mensagens encontradas.');
}

['m-veiculo', 'm-local', 'm-horario', 'm-busca'].forEach((id) => $(id).addEventListener('input', desenharMensagens));
$('m-horario').value = pad(new Date().getHours()) + ':' + pad(new Date().getMinutes());
$('resumo-mensagens').textContent = MENSAGENS.length;
desenharMensagens();

/* ---------- conversor de coordenadas ---------- */
function converterCoordenadas() {
    const bruto = $('c-entrada').value.trim();
    const erro = $('c-erro');
    const abrir = $('c-abrir');
    $('c-mapa').value = '';
    $('c-planilha').value = '';
    abrir.setAttribute('aria-disabled', 'true');
    abrir.href = '#coordenadas';
    erro.textContent = '';
    if (!bruto) return;

    const numeros = bruto.match(/-?\d+(?:[.,]\d+)?/g);
    if (!numeros || numeros.length !== 2) {
        erro.textContent = 'Informe exatamente dois números: latitude e longitude.';
        return;
    }
    const [lat, lon] = numeros.map((n) => parseFloat(n.replace(',', '.')));
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        erro.textContent = 'Valores fora do intervalo: latitude vai de -90 a 90 e longitude de -180 a 180.';
        return;
    }

    $('c-mapa').value = lat + ', ' + lon;
    $('c-planilha').value = String(lat).replace('.', ',') + ';' + String(lon).replace('.', ',');
    abrir.href = 'https://www.google.com/maps?q=' + encodeURIComponent(lat + ',' + lon);
    abrir.removeAttribute('aria-disabled');
}
$('c-entrada').addEventListener('input', converterCoordenadas);

/* ---------- alfabeto fonético ---------- */
const FONETICO = {
    A: 'Alfa', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot', G: 'Golf', H: 'Hotel',
    I: 'India', J: 'Juliett', K: 'Kilo', L: 'Lima', M: 'Mike', N: 'November', O: 'Oscar', P: 'Papa',
    Q: 'Quebec', R: 'Romeo', S: 'Sierra', T: 'Tango', U: 'Uniform', V: 'Victor', W: 'Whiskey',
    X: 'X-ray', Y: 'Yankee', Z: 'Zulu',
    0: 'Zero', 1: 'Um', 2: 'Dois', 3: 'Três', 4: 'Quatro', 5: 'Cinco', 6: 'Seis', 7: 'Sete', 8: 'Oito', 9: 'Nove'
};

(function tabelaFonetica() {
    const tabela = $('f-tabela');
    Object.keys(FONETICO).forEach((letra) => {
        const item = document.createElement('li');
        const forte = document.createElement('strong');
        forte.textContent = letra;
        item.append(forte, ' ' + FONETICO[letra]);
        tabela.appendChild(item);
    });
})();

$('f-entrada').addEventListener('input', () => {
    const letras = normaliza($('f-entrada').value).toUpperCase().replace(/[^A-Z0-9]/g, '').split('');
    $('f-saida').textContent = letras.map((l) => FONETICO[l]).join(' - ');
});

/* ---------- código Q ---------- */
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
        const linha = document.createElement('tr');
        const c1 = document.createElement('td');
        const c2 = document.createElement('td');
        c1.textContent = codigo;
        c2.textContent = significado;
        linha.append(c1, c2);
        corpo.appendChild(linha);
    });
    $('q-contagem').textContent = exibidos === 0
        ? 'Nenhum código encontrado.'
        : exibidos + (exibidos === 1 ? ' código encontrado.' : ' códigos encontrados.');
}
$('q-busca').addEventListener('input', desenharCodigosQ);
desenharCodigosQ();

/* ---------- botão de voltar ao topo ---------- */
const botaoTopo = $('voltar-topo');
window.addEventListener('scroll', () => { botaoTopo.hidden = window.scrollY < 400; }, { passive: true });
botaoTopo.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ---------- destaque da seção atual no menu ---------- */
(function menuAtivo() {
    if (!('IntersectionObserver' in window)) return;
    const links = Array.from(document.querySelectorAll('.menu a'));
    const secoes = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
            if (!entrada.isIntersecting) return;
            links.forEach((a) => a.removeAttribute('aria-current'));
            const ativo = links.find((a) => a.getAttribute('href') === '#' + entrada.target.id);
            if (ativo) ativo.setAttribute('aria-current', 'true');
        });
    }, { rootMargin: '-30% 0px -60% 0px' });
    secoes.forEach((s) => observador.observe(s));
})();
