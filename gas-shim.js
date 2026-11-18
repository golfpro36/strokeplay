/**
 * gas-shim.js — ทำให้โค้ดหน้าเว็บที่ใช้ google.script.run ทำงานนอก Apps Script (fetch → doPost)
 * คำสั่งอ่านอย่างเดียวลองใหม่อัตโนมัติ 2 ครั้ง (สุ่มหน่วง 1.5–3 วิ); คำสั่งบันทึกคะแนนไม่ลองซ้ำเอง (หน้าเว็บมีคิวออฟไลน์ + opId กันบันทึกซ้ำ)
 * v1.3.1 หมดเวลา 45 วิ (AbortController) • แจ้งเวอร์ชันเซิร์ฟเวอร์ผ่าน event 'gp-sv'
 */
(function () {
  var READ_ONLY = ['getPublicEvents', 'getEventData', 'getAdminContact', 'scorerLogin', 'getCommitteeData', 'verifyAdminPin'];
  function call(fn, args) {
    var api = window.GOLFPRO_API || '';
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]{20,}\/exec$/.test(api)) {
      return Promise.reject(new Error('ยังไม่ได้ตั้งค่า config.js — วางลิงก์ Web App ของ Apps Script (ลงท้ายด้วย /exec)'));
    }
    var tries = READ_ONLY.indexOf(fn) >= 0 ? 3 : 1;
    function once(n) {
      var ac = typeof AbortController === 'function' ? new AbortController() : null;
      var t = ac ? setTimeout(function () { ac.abort(); }, 45000) : 0;
      return fetch(api, { method: 'POST', redirect: 'follow', cache: 'no-store', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ fn: fn, args: args }), signal: ac ? ac.signal : undefined })
        .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('เซิร์ฟเวอร์ตอบกลับผิดปกติ (' + r.status + ')'); return r.json(); })
        .catch(function (e) {
          clearTimeout(t);
          if (e && e.name === 'AbortError') e = new Error('เซิร์ฟเวอร์ตอบช้าเกินไป — ลองใหม่อีกครั้ง');
          if (n > 1) return new Promise(function (ok) { setTimeout(ok, 1500 + Math.floor(Math.random() * 1500)); }).then(function () { return once(n - 1); });
          throw e;
        });
    }
    return once(tries)
      .catch(function (e) { throw new Error(e && /JSON|Failed to fetch|NetworkError|Load failed/.test(e.message) ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ — ตรวจสอบอินเทอร์เน็ต' : (e.message || String(e))); })
      .then(function (o) {
        if (o && o.sv) { try { window.dispatchEvent(new CustomEvent('gp-sv', { detail: o.sv })); } catch (e) {} }
        if (!o || !o.ok) throw new Error((o && o.err) || 'เกิดข้อผิดพลาด'); return o.v; });
  }
  function runner(h) {
    return new Proxy({}, { get: function (_, k) {
      if (k === 'withSuccessHandler') return function (f) { return runner(Object.assign({}, h, { s: f })); };
      if (k === 'withFailureHandler') return function (f) { return runner(Object.assign({}, h, { f: f })); };
      if (k === 'withUserObject') return function (u) { return runner(Object.assign({}, h, { u: u })); };
      return function () {
        var args = Array.prototype.slice.call(arguments);
        call(String(k), args).then(function (v) { if (h.s) h.s(v, h.u); }, function (e) { if (h.f) h.f(e, h.u); else console.error(e); });
      };
    } });
  }
  window.google = window.google || {};
  window.google.script = { run: runner({}), host: { close: function () {} } };
})();
