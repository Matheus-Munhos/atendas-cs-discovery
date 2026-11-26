/*
 * support.js
 * Runtime leve para abrir as telas do discovery do Atendas CS fora do canvas.
 * Interpreta o formato das telas (.dc.html):
 *   <x-dc> ... </x-dc>                      conteúdo da tela (o <helmet> vai para o <head>)
 *   {{ caminho }}                           valores em textos e atributos
 *   <sc-for list="{{lista}}" as="item">     repetição
 *   <sc-if value="{{condicao}}">            exibição condicional
 *   onClick / onChange / onInput="{{fn}}"   eventos
 *   <script type="text/x-dc" data-dc-script> class Component extends DCLogic { ... }
 * A cada setState a tela é desenhada de novo, preservando foco, seleção,
 * rolagem e o que foi digitado em campos que não estão ligados ao estado.
 */
(function () {
  'use strict';

  var EVENTOS = { onclick: 'click', onchange: 'change', oninput: 'input' };
  var HOLE = /\{\{\s*([^}]*?)\s*\}\}/g;
  var SO_HOLE = /^\s*\{\{\s*([^}]*?)\s*\}\}\s*$/;

  // ---------------- classe base dos componentes ----------------
  function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  }
  DCLogic.prototype.setState = function (patch) {
    var novo = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = Object.assign({}, this.state, novo || {});
    if (this.__agendar) this.__agendar();
  };
  DCLogic.prototype.renderVals = function () { return {}; };
  window.DCLogic = DCLogic;

  // ---------------- avaliação de expressões ----------------
  function avaliar(expr, escopo) {
    expr = (expr || '').trim();
    if (expr === '') return '';
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
    if (/^'.*'$/.test(expr) || /^".*"$/.test(expr)) return expr.slice(1, -1);
    var partes = expr.split('.');
    var atual = escopo[partes[0]];
    for (var i = 1; i < partes.length; i++) {
      if (atual == null) return undefined;
      atual = atual[partes[i]];
    }
    return atual;
  }
  function texto(v) {
    if (v === undefined || v === null || v === false) return '';
    return String(v);
  }
  function interpolar(str, escopo) {
    return str.replace(HOLE, function (_, e) { return texto(avaliar(e, escopo)); });
  }

  // ---------------- identificação estável dos nós ----------------
  var ids = new WeakMap();
  var proximoId = 1;
  function idDe(no) {
    if (!ids.has(no)) ids.set(no, proximoId++);
    return ids.get(no);
  }

  // ---------------- desenho ----------------
  function desenhar(no, escopo, caminho, destino) {
    if (no.nodeType === 3) {
      destino.appendChild(document.createTextNode(no.nodeValue.indexOf('{{') >= 0 ? interpolar(no.nodeValue, escopo) : no.nodeValue));
      return;
    }
    if (no.nodeType !== 1) return;
    var tag = no.localName;

    if (tag === 'sc-for') {
      var m = SO_HOLE.exec(no.getAttribute('list') || '');
      var lista = m ? avaliar(m[1], escopo) : [];
      var nome = no.getAttribute('as') || 'item';
      if (!Array.isArray(lista)) return;
      lista.forEach(function (item, i) {
        var filho = Object.create(escopo);
        filho[nome] = item;
        filho.$index = i;
        for (var c = no.firstChild; c; c = c.nextSibling) desenhar(c, filho, caminho + '.' + idDe(no) + ':' + i, destino);
      });
      return;
    }
    if (tag === 'sc-if') {
      var mv = SO_HOLE.exec(no.getAttribute('value') || '');
      var cond = mv ? avaliar(mv[1], escopo) : !!no.getAttribute('value');
      if (cond) for (var c2 = no.firstChild; c2; c2 = c2.nextSibling) desenhar(c2, escopo, caminho, destino);
      return;
    }

    var el = no.namespaceURI && no.namespaceURI !== 'http://www.w3.org/1999/xhtml'
      ? document.createElementNS(no.namespaceURI, no.localName)
      : document.createElement(no.localName);
    var chave = idDe(no) + '|' + caminho;
    var props = {};
    var controlado = false;

    for (var a = 0; a < no.attributes.length; a++) {
      var at = no.attributes[a];
      var n = at.name, v = at.value;
      if (n.indexOf('hint-') === 0) continue;
      var so = SO_HOLE.exec(v);
      if (EVENTOS[n] && so) {
        var fn = avaliar(so[1], escopo);
        if (typeof fn === 'function') el.addEventListener(EVENTOS[n], fn);
        continue;
      }
      if (so && (n === 'checked' || n === 'disabled' || n === 'selected')) {
        var b = avaliar(so[1], escopo);
        var ligado = b === true || b === 'true';
        props[n] = ligado;
        if (ligado) el.setAttribute(n, '');
        if (n === 'checked') controlado = true;
        continue;
      }
      if (so && n === 'value') {
        props.value = texto(avaliar(so[1], escopo));
        controlado = true;
        el.setAttribute('value', props.value);
        continue;
      }
      el.setAttribute(n, v.indexOf('{{') >= 0 ? interpolar(v, escopo) : v);
    }

    if (tag === 'textarea') {
      var conteudo = '';
      for (var t = no.firstChild; t; t = t.nextSibling) if (t.nodeType === 3) conteudo += t.nodeValue;
      if (conteudo.indexOf('{{') >= 0) controlado = true;
      el.value = interpolar(conteudo, escopo);
      el.defaultValue = el.value;
    } else {
      for (var c3 = no.firstChild; c3; c3 = c3.nextSibling) desenhar(c3, escopo, caminho, el);
    }

    if (tag === 'input' || tag === 'select' || tag === 'textarea') {
      el.setAttribute('data-dc-k', chave);
      if (!controlado) el.setAttribute('data-dc-livre', '');
    }
    destino.appendChild(el);
    if ('value' in props && el.type !== 'file') el.value = props.value;
    if ('checked' in props) el.checked = props.checked;
    if ('disabled' in props) el.disabled = props.disabled;
  }

  // ---------------- montagem da tela ----------------
  function montar() {
    var raiz = document.querySelector('x-dc');
    if (!raiz) return;

    var helmet = raiz.querySelector('helmet');
    if (helmet) {
      while (helmet.firstChild) document.head.appendChild(helmet.firstChild);
      helmet.parentNode.removeChild(helmet);
    }

    var modelo = document.createElement('div');
    while (raiz.firstChild) modelo.appendChild(raiz.firstChild);

    var codigo = document.querySelector('script[data-dc-script]');
    var Componente = DCLogic;
    if (codigo) {
      try {
        Componente = new Function('DCLogic', codigo.textContent + '\nreturn Component;')(DCLogic);
      } catch (erro) {
        console.error('Erro no código da tela:', erro);
      }
    }
    var props = {};
    try { props = JSON.parse(codigo && codigo.getAttribute('data-props') || '{}'); } catch (e) { props = {}; }
    var comp = new Componente(props);

    var agendado = false;
    function render() {
      agendado = false;
      var foco = document.activeElement;
      var kFoco = foco && foco.getAttribute && foco.getAttribute('data-dc-k');
      var selIni = null, selFim = null;
      try { if (kFoco) { selIni = foco.selectionStart; selFim = foco.selectionEnd; } } catch (e) { /* campo sem seleção */ }
      var livres = {};
      raiz.querySelectorAll('[data-dc-livre]').forEach(function (c) {
        livres[c.getAttribute('data-dc-k')] = { value: c.value, checked: c.checked, sel: c.selectedIndex };
      });
      var x = window.scrollX, y = window.scrollY;

      var vals;
      try { vals = comp.renderVals() || {}; } catch (erro) { console.error('Erro ao calcular a tela:', erro); vals = {}; }
      var frag = document.createDocumentFragment();
      for (var c = modelo.firstChild; c; c = c.nextSibling) desenhar(c, vals, '', frag);
      raiz.innerHTML = '';
      raiz.appendChild(frag);

      raiz.querySelectorAll('[data-dc-livre]').forEach(function (c) {
        var s = livres[c.getAttribute('data-dc-k')];
        if (!s) return;
        if (c.type === 'checkbox' || c.type === 'radio') c.checked = s.checked;
        else if (c.tagName === 'SELECT') c.selectedIndex = s.sel;
        else if (c.type !== 'file') c.value = s.value;
      });
      if (kFoco) {
        var novo = raiz.querySelector('[data-dc-k="' + kFoco.replace(/"/g, '\\"') + '"]');
        if (novo) {
          novo.focus({ preventScroll: true });
          try { if (selIni !== null) novo.setSelectionRange(selIni, selFim); } catch (e) { /* tipo sem seleção */ }
        }
      }
      window.scrollTo(x, y);
    }
    comp.__agendar = function () {
      if (agendado) return;
      agendado = true;
      Promise.resolve().then(render);
    };
    raiz.style.display = 'block';
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();
})();
