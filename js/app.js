/* ===== Pulso: código compartilhado =====
   O que costuma mudar (nome, páginas, listas de opções) fica no CONFIG.
   As páginas só chamam as funções abaixo. Para ligar a um servidor no futuro,
   troque o conteúdo de Store e dos métodos de Conta/Treinos. */

/* ---------- CONFIG: altere aqui ---------- */
const CONFIG = {
  nomeSite: 'Pulso',
  idadeMinima: 14,
  paginas: { login: 'pag1.html', painel: 'pag2.html', saude: 'pag3.html', config: 'pag6.html', perfil: 'pag6.html#perfil' },
  chaves: { usuarios: 'pulso_usuarios', sessao: 'pulso_sessao', treinos: 'pulso_treinos', checkins: 'pulso_checkins', medidas: 'pulso_medidas', tema: 'pulso_tema', acessibilidade: 'pulso_acessibilidade' },
  menu: [['pag2.html', 'Painel', '📊'], ['pag4.html', 'Recuperação', '🌙'], ['pag5.html', 'Evolução', '📈'], ['pag3.html', 'Minha saúde', '❤️']],
  menuRodape: [['pag6.html', 'Configurações', '⚙️']],   // fica na parte de baixo do menu lateral
  condicoesRisco: ['Problema cardíaco', 'Pressão alta'],
  // Aplicativo instalável: o service worker só liga em https (ou aqui, se serviceWorkerEmLocalhost for true).
  // Deixe false enquanto edita o site, para o navegador não guardar arquivos antigos.
  app: { serviceWorkerEmLocalhost: false },

  // Fotos e vídeos do site: coloque o arquivo em img/ ou video/ e escreva o caminho em src (ex.: 'img/banner.jpg').
  // Com src vazio aparece um espaço reservado. mostrarVazios: false esconde os espaços ainda vazios.
  midias: {
    mostrarVazios: true,
    'login-hero': { src: '', legenda: 'Foto ou vídeo de abertura' },
    'painel-banner': { src: '', legenda: 'Foto do banner' },
    'recuperacao-video': { src: '', poster: '', legenda: 'Vídeo de alongamento ou respiração' }
  },
  opcoes: {
    sexos: ['Feminino', 'Masculino', 'Prefiro não informar'],
    objetivos: ['Melhorar o condicionamento', 'Ganhar massa muscular', 'Emagrecer', 'Melhorar o desempenho no meu esporte', 'Voltar de uma lesão', 'Manter a saúde'],
    niveis: ['Sedentário', 'Iniciante', 'Intermediário', 'Avançado'],
    intensidades: ['Leve', 'Moderada', 'Intensa'],
    energia: ['Muito baixa', 'Baixa', 'Média', 'Alta', 'Muito alta'],
    dor: ['Nenhuma', 'Leve', 'Moderada', 'Forte'],
    // O último item é tratado como "nenhum" e desmarca os outros.
    condicoes: ['Problema cardíaco', 'Pressão alta', 'Asma ou problema respiratório', 'Diabetes', 'Lesão em joelho, ombro ou coluna', 'Nenhum deles']
  }
};

/* ---------- Utilitários ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function el(tag, txt, cls) {
  const e = document.createElement(tag);
  if (txt != null) e.textContent = txt;
  if (cls) e.className = cls;
  return e;
}

/* ---------- Armazenamento (hoje: navegador) ---------- */
const Store = {
  ler(k, p) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : p; } catch { return p; } },
  gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  remover(k) { try { localStorage.removeItem(k); } catch {} }
};

/* ---------- Acessibilidade (Configurações) ----------
   As preferências viram atributos no <html> (data-fonte, data-contraste, data-links, data-movimento)
   e o estilo.css reage a eles. É aplicada assim que o app.js carrega, em todas as páginas. */
const Acessibilidade = {
  padrao: { fonte: 'normal', contraste: false, sublinharLinks: false, reduzirMovimento: false },
  ler() {
    const o = { ...this.padrao, ...Store.ler(CONFIG.chaves.acessibilidade, {}) };
    if (!['normal', 'grande', 'maior'].includes(o.fonte)) o.fonte = 'normal';
    return o;
  },
  aplicar(o = this.ler()) {
    const h = document.documentElement.dataset;
    h.fonte = o.fonte;
    const ligar = (chave, ligado, valor) => { if (ligado) h[chave] = valor; else delete h[chave]; };
    ligar('contraste', o.contraste, 'alto');
    ligar('links', o.sublinharLinks, 'sim');
    ligar('movimento', o.reduzirMovimento, 'reduzido');
  },
  salvar(o) {
    const ok = Store.gravar(CONFIG.chaves.acessibilidade, { ...this.padrao, ...o });
    this.aplicar();
    return ok;
  }
};
Acessibilidade.aplicar();

/* ---------- Datas (formato interno AAAA-MM-DD) ---------- */
const Datas = {
  iso(d) { return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); },
  hoje() { return this.iso(new Date()); },
  soma(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return this.iso(d); },
  semana() { const i = this.soma(this.hoje(), -((new Date().getDay() + 6) % 7)); return Array.from({ length: 7 }, (_, n) => this.soma(i, n)); },
  br(iso) { return iso.split('-').reverse().join('/'); },
  segunda(n = 0) { return this.soma(this.hoje(), -((new Date().getDay() + 6) % 7) - 7 * n); },   // segunda-feira de n semanas atrás
  inicioMes(n = 0) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - n); return this.iso(d); },
  fimMes(n = 0) { return n === 0 ? this.hoje() : this.soma(this.inicioMes(n - 1), -1); },
  idade(nasc) {
    const d = new Date(nasc + 'T12:00:00'), h = new Date();
    let a = h.getFullYear() - d.getFullYear();
    if (h < new Date(h.getFullYear(), d.getMonth(), d.getDate())) a--;
    return a;
  }
};

/* ---------- Conta ---------- */
const Conta = {
  todos() { return Store.ler(CONFIG.chaves.usuarios, {}); },
  atual() { const e = Store.ler(CONFIG.chaves.sessao, null); return e ? this.todos()[e] || null : null; },
  sal() {
    const b = new Uint8Array(12);
    window.crypto && crypto.getRandomValues ? crypto.getRandomValues(b) : b.forEach((_, i) => b[i] = Math.random() * 256);
    return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  },
  async hash(senha, sal) {
    const dados = new TextEncoder().encode(sal + ':' + senha);
    if (window.crypto && crypto.subtle) {
      const h = await crypto.subtle.digest('SHA-256', dados);
      return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381; for (const c of dados) h = ((h << 5) + h + c) >>> 0;
    return 'f' + h.toString(16);
  },
  async criar(d) {
    const email = d.email.trim().toLowerCase(), todos = this.todos();
    if (todos[email]) return { erro: 'Já existe uma conta com esse e-mail. Use a aba Entrar.' };
    const { senha, ...perfil } = d, sal = this.sal();
    todos[email] = { ...perfil, email, sal, hash: await this.hash(senha, sal), criadoEm: new Date().toISOString() };
    if (!Store.gravar(CONFIG.chaves.usuarios, todos)) return { erro: 'Não foi possível salvar. Verifique se o navegador permite armazenamento.' };
    Store.gravar(CONFIG.chaves.sessao, email);
    return { ok: true };
  },
  async entrar(email, senha) {
    email = email.trim().toLowerCase();
    const u = this.todos()[email];
    if (!u || await this.hash(senha, u.sal) !== u.hash) return { erro: 'E-mail ou senha incorretos.' };
    Store.gravar(CONFIG.chaves.sessao, email);
    return { ok: true };
  },
  atualizar(campos) {
    const u = this.atual(); if (!u) return false;
    const todos = this.todos(); todos[u.email] = { ...u, ...campos };
    return Store.gravar(CONFIG.chaves.usuarios, todos);
  },
  async alterarEmail(novo) {
    const u = this.atual();
    if (!u) return { ok: false, erro: 'Sua sessão terminou. Entre novamente.' };
    novo = novo.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novo)) return { ok: false, erro: 'Digite um e-mail válido.' };
    if (novo === u.email) return { ok: false, erro: 'Esse já é o e-mail da sua conta.' };
    const todos = this.todos();
    if (todos[novo]) return { ok: false, erro: 'Já existe uma conta com esse e-mail.' };
    todos[novo] = { ...u, email: novo }; delete todos[u.email];
    if (!Store.gravar(CONFIG.chaves.usuarios, todos)) return { ok: false, erro: 'Não foi possível salvar no navegador.' };
    ['treinos', 'checkins', 'medidas'].forEach(k => {   // os registros acompanham o novo e-mail
      const c = Store.ler(CONFIG.chaves[k], {});
      if (c[u.email]) { c[novo] = c[u.email]; delete c[u.email]; Store.gravar(CONFIG.chaves[k], c); }
    });
    Store.gravar(CONFIG.chaves.sessao, novo);
    return { ok: true, mensagem: 'E-mail atualizado neste navegador.' };
  },
  async alterarSenha(atual, nova) {
    const u = this.atual();
    if (!u) return { erro: 'Sua sessão terminou. Entre novamente.' };
    if (await this.hash(atual, u.sal) !== u.hash) return { erro: 'A senha atual está incorreta.' };
    if (nova.length < 8) return { erro: 'A nova senha precisa ter pelo menos 8 caracteres.' };
    if (nova === atual) return { erro: 'A nova senha precisa ser diferente da atual.' };
    const sal = this.sal();
    return this.atualizar({ sal, hash: await this.hash(nova, sal) }) ? true : { erro: 'Não foi possível salvar no navegador.' };
  },
  sair() { Store.remover(CONFIG.chaves.sessao); location.href = CONFIG.paginas.login; },
  apagar() {
    const u = this.atual(); if (!u) return;
    const todos = this.todos(); delete todos[u.email]; Store.gravar(CONFIG.chaves.usuarios, todos);
    ['treinos', 'checkins', 'medidas'].forEach(k => { const c = Store.ler(CONFIG.chaves[k], {}); delete c[u.email]; Store.gravar(CONFIG.chaves[k], c); });
    this.sair();
  },
  exigirLogin() { const u = this.atual(); if (!u) { location.replace(CONFIG.paginas.login); return null; } return u; }
};

/* ---------- Treinos ---------- */
const Treinos = {
  listar() { const u = Conta.atual(); return u ? Store.ler(CONFIG.chaves.treinos, {})[u.email] || [] : []; },
  _salvar(lista) { const t = Store.ler(CONFIG.chaves.treinos, {}); t[Conta.atual().email] = lista; return Store.gravar(CONFIG.chaves.treinos, t); },
  adicionar(t) { const l = this.listar(); l.push({ id: Date.now(), ...t }); return this._salvar(l); },
  remover(id) { return this._salvar(this.listar().filter(x => x.id !== id)); },
  totais(ini, fim) {
    const l = this.listar().filter(t => t.data >= ini && t.data <= fim);
    return { min: l.reduce((s, t) => s + t.min, 0), dias: new Set(l.map(t => t.data)).size, treinos: l.length };
  },
  semanasSeguidas(meta) {   // semanas (segunda a domingo) seguidas com pelo menos `meta` dias de treino; a semana atual só entra se já cumpriu a meta
    const cumpriu = n => this.totais(Datas.segunda(n), Datas.soma(Datas.segunda(n), 6)).dias >= meta;
    let total = cumpriu(0) ? 1 : 0, k = 1;
    while (k < 520 && cumpriu(k)) { total++; k++; }
    return total;
  },
  minutosPorDia() { const m = {}; this.listar().forEach(t => m[t.data] = (m[t.data] || 0) + t.min); return m; },
  sequencia() {
    const m = this.minutosPorDia(); let d = Datas.hoje(), n = 0;
    if (!m[d]) d = Datas.soma(d, -1);
    while (m[d]) { n++; d = Datas.soma(d, -1); }
    return n;
  }
};

/* ---------- Registros diários: check-ins de recuperação e medidas corporais ---------- */
const fmt = n => String(n).replace('.', ',');   // 7.5 -> "7,5"
function colecao(chave) {
  return {
    listar() { const u = Conta.atual(); return u ? Store.ler(chave, {})[u.email] || [] : []; },
    salvar(lista) { const t = Store.ler(chave, {}); t[Conta.atual().email] = lista; return Store.gravar(chave, t); },
    registrar(r) { const l = this.listar().filter(x => x.data !== r.data); l.push(r); return this.salvar(l); },   // um registro por data
    doDia(data) { return this.listar().find(x => x.data === data) || null; },
    remover(data) { return this.salvar(this.listar().filter(x => x.data !== data)); }
  };
}
const Checkins = colecao(CONFIG.chaves.checkins);
const Medidas = colecao(CONFIG.chaves.medidas);

/* ---------- Saúde (indicadores gerais, não substituem avaliação profissional) ---------- */
const Saude = {
  imc(u) { return u.peso / Math.pow(u.altura / 100, 2); },
  faixaImc(v) { return v < 18.5 ? 'abaixo da faixa de referência' : v < 25 ? 'dentro da faixa de referência' : v < 30 ? 'acima da faixa de referência' : 'bem acima da faixa de referência'; },
  fcMax(idade) { return Math.round(208 - 0.7 * idade); },   // fórmula de Tanaka
  zonas(fc) {
    return [['Zona 1: recuperação', 50, 60], ['Zona 2: base aeróbica', 60, 70], ['Zona 3: ritmo moderado', 70, 80],
      ['Zona 4: limiar', 80, 90], ['Zona 5: esforço máximo', 90, 100]].map(([n, a, b]) => [n, Math.round(fc * a / 100), Math.round(fc * b / 100)]);
  },
  aguaLitros(peso) { return (peso * 35 / 1000).toFixed(1); },
  precisaMedico(u) { return u.parq === 'Sim' || u.condicoes.some(c => CONFIG.condicoesRisco.includes(c)); }
};

/* ---------- Componentes de interface ---------- */
function avatar(u, grande) {
  const a = el('span', null, 'avatar' + (grande ? ' grande' : ''));
  if (u.foto) { const i = document.createElement('img'); i.src = u.foto; i.alt = ''; a.append(i); }
  else a.textContent = u.nome.trim()[0].toUpperCase();
  return a;
}

/* Grupo de botões de escolha única: troca um <select> quando há poucas opções.
   opcoes: lista de valores, ou de [valor, texto]. Devolve { valor, definir(v) }; definir(null) desmarca tudo. */
function grupoChips(box, opcoes, { inicial = null, rotulo = '', aoMudar } = {}) {
  box.textContent = ''; box.className = 'chips'; box.setAttribute('role', 'radiogroup');
  if (rotulo) box.setAttribute('aria-label', rotulo);
  const g = { valor: null };
  const botoes = opcoes.map(o => {
    const [valor, texto] = Array.isArray(o) ? o : [o, o], b = el('button', String(texto), 'chip');
    b.type = 'button'; b.setAttribute('role', 'radio'); b._valor = valor;
    b.onclick = () => g.definir(valor);
    box.append(b); return b;
  });
  g.definir = (v, silencioso) => {
    g.valor = v;
    botoes.forEach(b => b.setAttribute('aria-checked', b._valor === v));
    if (!silencioso && aoMudar) aoMudar(v);
  };
  g.definir(inicial, true);
  return g;
}

/* Monta o menu lateral (no celular vira barra inferior) e a barra do topo. Pode ser chamada de novo para atualizar o avatar. */
function montarTopo() {
  const t = $('#topo'), u = Conta.atual(), pag = location.pathname.split('/').pop();
  document.body.classList.add('app');
  t.className = 'barra'; t.textContent = '';
  if (!$('.conteudo')) {
    const col = el('div', null, 'conteudo'); t.before(col); col.append(t, $('main'));
    const lateral = el('aside', null, 'lateral'), nav = el('nav');
    nav.setAttribute('aria-label', 'Principal');
    lateral.append(el('div', CONFIG.nomeSite, 'logo'), nav);
    [...CONFIG.menu, ...CONFIG.menuRodape.map(i => [...i, true])].forEach(([href, txt, ico, rodape]) => {
      const a = el('a', null, rodape ? 'rodape' : ''); a.href = href; a.append(el('span', ico, 'ico'), el('span', txt));
      if (href === pag) a.setAttribute('aria-current', 'page');
      nav.append(a);
    });
    col.before(lateral);
  }
  const perfil = el('a', null, 'perfil'); perfil.href = CONFIG.paginas.perfil; perfil.setAttribute('aria-label', 'Minha conta');
  perfil.append(avatar(u), el('span', u.nome.split(' ')[0]));
  const sair = el('button', 'Sair', 'btn sec mini'); sair.type = 'button'; sair.onclick = () => Conta.sair();
  t.append(el('div', CONFIG.nomeSite, 'logo mobile'), botaoTema(), perfil, sair);
}

function preencher(select, lista, placeholder) {
  if (placeholder) select.append(new Option(placeholder, ''));
  lista.forEach(v => select.append(new Option(v, v)));
}

function montarChecks(box, lista) {
  lista.forEach(v => {
    const l = el('label', null, 'check'), i = document.createElement('input');
    i.type = 'checkbox'; i.value = v; l.append(i, ' ' + v); box.append(l);
  });
  const nenhum = lista[lista.length - 1];
  box.addEventListener('change', e => {
    if (!e.target.checked) return;
    $$('input', box).forEach(c => { if (c !== e.target && (e.target.value === nenhum || c.value === nenhum)) c.checked = false; });
  });
}

/* ---------- Tema claro/escuro (a escolha fica salva neste aparelho) ---------- */
function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
  Store.gravar(CONFIG.chaves.tema, tema);
  corDaBarra();
}
// Cor da barra de status do celular acompanha o tema
function corDaBarra() {
  const m = $('meta[name=theme-color]');
  if (m) m.content = document.documentElement.dataset.tema === 'escuro' ? '#111813' : '#F1F0EC';
}
function botaoTema(extra) {
  const b = el('button', null, 'tema' + (extra ? ' ' + extra : ''));
  b.type = 'button';
  const atualizar = () => {
    const escuro = document.documentElement.dataset.tema === 'escuro';
    b.textContent = escuro ? '☀️' : '🌙';
    b.setAttribute('aria-label', escuro ? 'Mudar para o modo claro' : 'Mudar para o modo escuro');
    b.setAttribute('aria-pressed', escuro);
  };
  b.onclick = () => { aplicarTema(document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro'); atualizar(); };
  atualizar();
  return b;
}
// Plano B: o <head> de cada página já define o tema antes de desenhar; isto cobre o caso de ele faltar
if (!document.documentElement.dataset.tema) document.documentElement.dataset.tema = Store.ler(CONFIG.chaves.tema, 'claro');
corDaBarra();

/* ---------- Aplicativo instalável (PWA) ---------- */
let convitePwa = null;
const modoApp = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
function registrarApp(forcar) {
  const seguro = location.protocol === 'https:' || forcar || CONFIG.app.serviceWorkerEmLocalhost;
  if (!('serviceWorker' in navigator) || !seguro) return Promise.resolve(null);
  return navigator.serviceWorker.register('sw.js').catch(() => null);
}
window.addEventListener('load', () => registrarApp());
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); convitePwa = e; document.dispatchEvent(new Event('convite-app')); });
window.addEventListener('appinstalled', () => { convitePwa = null; document.dispatchEvent(new Event('convite-app')); });
function instalarApp() {
  if (!convitePwa) return Promise.resolve(false);
  const c = convitePwa; convitePwa = null; c.prompt();
  return c.userChoice.then(r => r.outcome === 'accepted');
}

/* Preenche os espaços de foto/vídeo ([data-midia="chave"]) com o que estiver em CONFIG.midias */
function montarMidias() {
  $$('[data-midia]').forEach(box => {
    const m = CONFIG.midias[box.dataset.midia] || {}, src = m.src || '';
    box.textContent = '';
    if (!src) {
      if (!CONFIG.midias.mostrarVazios) { (box.closest('.bloco-midia') || box).remove(); return; }
      box.classList.add('vazia');
      box.append(el('span', m.legenda || 'Espaço para foto ou vídeo'), el('small', 'Arquivo em img/ ou video/, caminho em CONFIG.midias'));
      return;
    }
    const video = /\.(mp4|webm|ogg)$/i.test(src), e = document.createElement(video ? 'video' : 'img');
    e.src = src;
    if (video) { e.controls = true; e.playsInline = true; e.preload = 'metadata'; if (m.poster) e.poster = m.poster; }
    else { e.alt = m.legenda || ''; e.loading = 'lazy'; }
    box.append(e);
  });
}

/* Recorta a foto em quadrado e reduz (guarda só ~20 KB no navegador) */
function fotoParaDataURL(arquivo, lado = 256) {
  return new Promise((ok, falha) => {
    if (!arquivo.type.startsWith('image/')) return falha(new Error('Escolha um arquivo de imagem.'));
    const img = new Image(), url = URL.createObjectURL(arquivo);
    img.onload = () => {
      const c = document.createElement('canvas'), s = Math.min(img.width, img.height);
      c.width = c.height = lado;
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, lado, lado);
      URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('Não foi possível ler essa imagem.')); };
    img.src = url;
  });
}

function ativarSenhas() {
  $$('[data-ver]').forEach(b => b.onclick = () => {
    const i = document.getElementById(b.dataset.ver), oculto = i.type === 'password';
    i.type = oculto ? 'text' : 'password';
    b.textContent = oculto ? 'Ocultar' : 'Mostrar';
  });
}

/* ---------- Dicas guiadas (Configurações → Dicas) ----------
   Leva a pessoa até cada página e mostra balões apontando para as funções.
   Para mudar o roteiro, edite a lista PASSOS: pag = página, alvo = seletor CSS do que será destacado
   (sem alvo, o balão aparece no centro). O passo atual fica na sessão (sessionStorage) enquanto o tour roda. */
const Tour = {
  chave: 'pulso_tour',
  passos: [
    { pag: 'pag2.html', icone: '👋', titulo: 'Bem-vindo ao Pulso!', texto: 'Vou levar você por cada página e mostrar, em balões, o que cada função faz. Use "Próxima" para avançar e "Voltar" para rever. Você pode sair quando quiser.' },
    { pag: 'pag2.html', alvo: '.lateral nav', icone: '🧭', titulo: 'Menu principal', texto: 'Por aqui você troca de página: Painel, Recuperação, Evolução, Minha saúde e Configurações. No celular, o menu fica na barra de baixo.' },
    { pag: 'pag2.html', alvo: '#topo .tema', icone: '🌗', titulo: 'Tema claro e escuro', texto: 'Este botão alterna entre o tema claro e o escuro. A escolha fica salva neste navegador.' },
    { pag: 'pag2.html', alvo: '#topo .perfil', icone: '👤', titulo: 'Seu perfil', texto: 'Sua foto e seu nome levam ao Perfil, em Configurações, onde você troca a foto e atualiza peso, altura e objetivo.' },
    { pag: 'pag2.html', alvo: '.saudacao', icone: '🎯', titulo: 'Meta da semana', texto: 'A barra mostra quantos dias você treinou em relação à meta de dias por semana que escolheu no cadastro.' },
    { pag: 'pag2.html', alvo: '.metricas', icone: '📊', titulo: 'Indicadores do dia', texto: 'Sono e água vêm do check-in de recuperação. "Treinos na semana" e "Semanas seguidas" (semanas em que você cumpriu a meta) vêm dos treinos que você registra.', exemplo: 'A referência de água é de cerca de 35 ml por quilo do seu peso.' },
    { pag: 'pag2.html', alvo: '#registrar', icone: '🏃', titulo: 'Registrar treino', texto: 'Toque no esporte, na duração e na intensidade e depois em "Salvar treino". O esporte do seu cadastro já vem escolhido. Ele entra nos indicadores, no calendário e nos gráficos na hora.', exemplo: 'Use "Repetir último" para salvar um treino igual ao anterior com um toque.' },
    { pag: 'pag2.html', alvo: '#calGrade', icone: '📅', titulo: 'Calendário', texto: 'Os dias em que você treinou ficam coloridos: quanto mais escuro, mais minutos. Toque em um dia para ver os treinos dele e adicionar um treino naquela data. No celular aparece a semana; dá para ver o mês inteiro.' },
    { pag: 'pag2.html', alvo: '#chips', icone: '📈', titulo: 'Análise da semana', texto: 'Escolha Treino, Água ou Sono para ver as barras de cada dia da semana atual.' },
    { pag: 'pag4.html', alvo: '#hoje', icone: '🌙', titulo: 'Recuperação: resumo de hoje', texto: 'Aqui aparecem o sono, a água e a energia que você registrou hoje, com a barra de hidratação.' },
    { pag: 'pag4.html', alvo: '#formCheck', icone: '📝', titulo: 'Check-in do dia', texto: 'Registre sono, água, energia, dor muscular e esforço do treino. Marque "dia de descanso" quando não treinar. Dá para escolher outra data e corrigir um dia que já salvou.', exemplo: 'Quanto mais dias registrados, mais úteis ficam as médias dos últimos 7 dias.' },
    { pag: 'pag5.html', alvo: '#cmpSemana', icone: '📊', titulo: 'Comparar períodos', texto: 'Compare minutos, dias de treino e número de treinos da semana e do mês atuais com o período anterior completo.' },
    { pag: 'pag5.html', alvo: '#formMed', icone: '⚖️', titulo: 'Peso e medidas', texto: 'Registre seu peso (e a cintura, se quiser). O peso mais recente atualiza o IMC em Minha saúde, e o gráfico de peso aparece com duas ou mais medidas.' },
    { pag: 'pag3.html', alvo: '#indicadores', icone: '❤️', titulo: 'Seus indicadores', texto: 'IMC, frequência cardíaca máxima estimada e água por dia, calculados com os seus dados. São referências gerais e não substituem um profissional de saúde.' },
    { pag: 'pag3.html', alvo: '#zonas', icone: '💓', titulo: 'Zonas de frequência cardíaca', texto: 'Faixas de batimentos para cada intensidade de treino, da recuperação ao esforço máximo. Use o relógio ou a contagem manual do pulso para saber em qual você está.' },
    { pag: 'pag6.html', alvo: '#perfil', icone: '🪪', titulo: 'Perfil', texto: 'Troque sua foto e atualize nome, peso, altura, objetivo, esporte e dias de treino. Os indicadores se ajustam sozinhos.' },
    { pag: 'pag6.html', alvo: '[aria-labelledby="tituloAcessibilidade"]', icone: '♿', titulo: 'Acessibilidade', texto: 'Aumente o texto, ligue o alto contraste, sublinhe os links ou reduza as animações. Toque em "Salvar preferências" para aplicar em todas as páginas.' },
    { pag: 'pag6.html', alvo: '[aria-labelledby="tituloApp"]', icone: '📲', titulo: 'Instalar como aplicativo', texto: 'Instale o Pulso na tela inicial do celular ou do computador para abrir em tela cheia. As instruções mudam conforme o aparelho.' },
    { pag: 'pag6.html', alvo: '[aria-labelledby="tituloDados"]', icone: '🔐', titulo: 'Seus dados', texto: 'Baixe uma cópia dos seus dados ou apague a conta. Neste protótipo os dados ficam só neste navegador e não passam para outros aparelhos.' },
    { pag: 'pag6.html', icone: '✅', titulo: 'Pronto!', texto: 'Você conheceu todas as páginas do Pulso. Para rever as dicas, volte a Configurações e toque em "Mostrar como o site funciona".' }
  ],
  balao: null, alvo: null, n: 0,
  _pagina() { return location.pathname.split('/').pop() || 'index.html'; },
  _ler() {
    try { const n = JSON.parse(sessionStorage.getItem(this.chave)); return Number.isInteger(n) && n >= 0 && n < this.passos.length ? n : null; } catch { return null; }
  },
  _gravar(n) { try { if (n === null) sessionStorage.removeItem(this.chave); else sessionStorage.setItem(this.chave, JSON.stringify(n)); } catch {} },

  iniciar() { this.ir(0); },
  ir(n) {                       // vai para o passo n, mudando de página se for preciso
    this._gravar(n);
    if (this.passos[n].pag !== this._pagina()) location.href = this.passos[n].pag;
    else this.mostrar(n);
  },
  retomar() {                   // chamado ao carregar cada página
    const n = this._ler();
    if (n === null) return;
    if (this.passos[n].pag !== this._pagina()) { this._gravar(null); return; }   // a pessoa saiu do roteiro por conta própria
    this.mostrar(n);
  },
  sair() {
    this._gravar(null);
    if (this.alvo) this.alvo.classList.remove('tour-alvo');
    if (this.balao) this.balao.remove();
    this.balao = this.alvo = null;
  },

  mostrar(n) {
    const p = this.passos[n], total = this.passos.length;
    this.n = n;
    if (this.alvo) this.alvo.classList.remove('tour-alvo');
    this.alvo = p.alvo ? $(p.alvo) : null;
    if (this.alvo && !this.alvo.getClientRects().length) this.alvo = null;   // alvo escondido: balão no centro
    if (this.alvo) this.alvo.classList.add('tour-alvo');

    if (!this.balao) {
      const b = el('div', null, 'tour-balao');
      b.setAttribute('role', 'dialog'); b.setAttribute('aria-labelledby', 'tourTitulo'); b.setAttribute('aria-describedby', 'tourTexto');
      b.tabIndex = -1;
      document.body.append(b); this.balao = b;
      b.addEventListener('keydown', e => { if (e.key === 'Escape') this.sair(); });
      addEventListener('resize', () => this.balao && this.posicionar());
      addEventListener('scroll', () => this.balao && this.posicionar(), { passive: true });
    }
    const b = this.balao; b.textContent = '';
    const fechar = el('button', '✕', 'tour-fechar'); fechar.type = 'button'; fechar.setAttribute('aria-label', 'Sair das dicas'); fechar.onclick = () => this.sair();
    const topo = el('div', null, 'tour-topo'); topo.append(el('span', 'Dica ' + (n + 1) + ' de ' + total), fechar);
    const prog = el('div', null, 'tour-progresso'), barra = el('span'); barra.style.width = ((n + 1) / total * 100) + '%'; prog.append(barra); prog.setAttribute('aria-hidden', 'true');
    const tit = el('h2', p.titulo); tit.id = 'tourTitulo';
    const txt = el('p', p.texto); txt.id = 'tourTexto';
    const volta = el('button', 'Voltar', 'btn sec'), avanca = el('button', n === total - 1 ? 'Concluir' : 'Próxima', 'btn');
    volta.type = avanca.type = 'button'; volta.disabled = n === 0;
    volta.onclick = () => this.ir(n - 1);
    avanca.onclick = () => n === total - 1 ? this.sair() : this.ir(n + 1);
    const acoes = el('div', null, 'tour-acoes'); acoes.append(volta, avanca);
    b.append(el('span', null, 'tour-seta'), topo, prog, el('div', p.icone, 'tour-simbolo'), tit, txt);
    if (p.exemplo) b.append(el('p', p.exemplo, 'tour-dica'));
    b.append(acoes);

    if (this.alvo && getComputedStyle(this.alvo).position !== 'fixed') {   // traz o alvo para a tela (sem animar)
      const alto = this.alvo.getBoundingClientRect().height > innerHeight * 0.7;
      this.alvo.scrollIntoView({ block: matchMedia('(max-width:820px)').matches || alto ? 'start' : 'center', behavior: 'auto' });
    }
    this.posicionar();
    b.focus({ preventScroll: true });
  },

  /* Coloca o balão perto do alvo (celular: faixa fixa acima do menu de baixo; sem alvo: centro da tela) */
  posicionar() {
    const b = this.balao, folga = 12;
    b.style.cssText = ''; b.className = 'tour-balao'; b.removeAttribute('data-lado');
    if (!this.alvo) { b.classList.add('centro'); return; }
    if (matchMedia('(max-width:820px)').matches) { b.classList.add('movel'); return; }
    const r = this.alvo.getBoundingClientRect(), bw = Math.min(380, innerWidth - 2 * folga), bh = b.offsetHeight, v = innerHeight, l = innerWidth;
    const limita = (x, min, max) => Math.max(min, Math.min(max, x));
    let top, left, lado = null;
    b.style.width = bw + 'px';
    if (v - r.bottom >= bh + 24) { top = r.bottom + 14; lado = 'cima'; }
    else if (r.top >= bh + 24) { top = r.top - bh - 14; lado = 'baixo'; }
    else if (l - r.right >= bw + 24) { left = r.right + 16; top = limita(r.top, folga, v - bh - folga); lado = 'esquerda'; }
    else if (r.left >= bw + 24) { left = r.left - bw - 16; top = limita(r.top, folga, v - bh - folga); lado = 'direita'; }
    else top = v - bh - 16;                      // alvo muito grande: balão sobre a parte de baixo dele
    if (left === undefined) left = limita(r.left + r.width / 2 - bw / 2, folga, l - bw - folga);
    b.style.top = top + 'px'; b.style.left = left + 'px';
    const seta = $('.tour-seta', b);
    if (lado) {
      b.dataset.lado = lado;
      if (lado === 'cima' || lado === 'baixo') seta.style.left = limita(r.left + r.width / 2 - left - 8, 18, bw - 34) + 'px';
      else seta.style.top = limita(r.top + Math.min(r.height, 80) / 2 - top - 8, 18, bh - 34) + 'px';
    }
  }
};
window.addEventListener('load', () => Tour.retomar());