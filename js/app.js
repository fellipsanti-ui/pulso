/* ===== Pulso: código compartilhado =====
   O que costuma mudar (nome, páginas, listas de opções) fica no CONFIG.
   As páginas só chamam as funções abaixo. Para ligar a um servidor no futuro,
   troque o conteúdo de Store e dos métodos de Conta/Treinos. */

/* ---------- CONFIG: altere aqui ---------- */
const CONFIG = {
  nomeSite: 'Pulso',
  idadeMinima: 14,
  paginas: { login: 'pag1.html', painel: 'pag2.html', saude: 'pag3.html' },
  chaves: { usuarios: 'pulso_usuarios', sessao: 'pulso_sessao', treinos: 'pulso_treinos', checkins: 'pulso_checkins', medidas: 'pulso_medidas', tema: 'pulso_tema' },
  menu: [['pag2.html', 'Painel', '📊'], ['pag4.html', 'Recuperação', '🌙'], ['pag5.html', 'Evolução', '📈'], ['pag3.html', 'Minha saúde', '❤️']],
  condicoesRisco: ['Problema cardíaco', 'Pressão alta'],
  // Aplicativo instalável: o service worker só liga em https (ou aqui, se serviceWorkerEmLocalhost for true).
  // Deixe false enquanto edita o site, para o navegador não guardar arquivos antigos.
  app: { serviceWorkerEmLocalhost: false },

  // As imagens atuais são ilustrações. Para usar fotos ou vídeos, troque o caminho em src.
  // Fotos e vídeos do site: coloque o arquivo em img/ ou video/ e escreva o caminho em src (ex.: 'img/banner.jpg').
  // Com src vazio aparece um espaço reservado. mostrarVazios: false esconde os espaços ainda vazios.
  midias: {
    mostrarVazios: true,
    'login-hero': { src: 'img/login-corrida.svg', legenda: 'Pessoa correndo numa pista ao nascer do sol' },
    'painel-banner': { src: 'img/painel-banner.svg', legenda: 'Colinas verdes com o batimento cardíaco' },
    'recuperacao-video': { src: 'img/recuperacao-alongamento.svg', poster: '', legenda: 'Pessoa se alongando em casa' }
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
    CONFIG.menu.forEach(([href, txt, ico]) => {
      const a = el('a'); a.href = href; a.append(el('span', ico, 'ico'), el('span', txt));
      if (href === pag) a.setAttribute('aria-current', 'page');
      nav.append(a);
    });
    col.before(lateral);
  }
  const perfil = el('a', null, 'perfil'); perfil.href = CONFIG.paginas.saude; perfil.setAttribute('aria-label', 'Minha conta');
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
