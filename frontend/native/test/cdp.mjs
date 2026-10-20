// Exécute du JavaScript dans la WebView de l'application via le protocole de débogage Chrome.
// Usage : node cdp.mjs request | camera
const mode = process.argv[2]

const targets = await (await fetch('http://127.0.0.1:9222/json')).json()
const page = targets.find((t) => t.type === 'page') ?? targets[0]
if (!page) {
  console.log(JSON.stringify({ ok: false, err: 'aucune page WebView' }))
  process.exit(1)
}

const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  ws.onopen = resolve
  ws.onerror = reject
})

let id = 0
function evaluate(expression) {
  const msgId = ++id
  ws.send(JSON.stringify({ id: msgId, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }))
  return new Promise((resolve) => {
    ws.addEventListener('message', function onMsg(ev) {
      const data = JSON.parse(ev.data)
      if (data.id !== msgId) return
      ws.removeEventListener('message', onMsg)
      resolve(data.result?.result?.value ?? data.result ?? data)
    })
  })
}

const scripts = {
  nodownload: `(async () => {
    localStorage.removeItem('fitlife:session')
    location.hash = ''
    await new Promise((r) => setTimeout(r, 300))
    history.pushState({}, '', '/login'); dispatchEvent(new PopStateEvent('popstate'))
    await new Promise((r) => setTimeout(r, 4000))
    const text = document.body.innerText
    return { ok: !/Télécharger l’application/.test(text), onLogin: /Se connecter/.test(text) }
  })()`,
  // Connecté (accueil, profil, menu) : toujours aucune section ni bouton de téléchargement.
  // Ouvre une session du compte membre de test puis recharge l'application.
  signin: `(() => {
    localStorage.setItem('fitlife:session', JSON.stringify({ token: 'tok_ci', userId: 'u_charly' }))
    setTimeout(() => location.reload(), 100)
    return { ok: true }
  })()`,
  nodownloadIn: `(async () => {
    const out = {}
    for (const path of ['/', '/profile', '/premium']) {
      history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate'))
      await new Promise((r) => setTimeout(r, 4000))
      const text = document.body.innerText
      const icon = document.querySelector('[aria-label*="Télécharger"], [title*="Télécharger"]')
      out[path] = { connected: !/Se connecter/.test(text), clean: !/Télécharger l’application/.test(text) && !icon }
    }
    localStorage.removeItem('fitlife:session')
    return { ok: Object.values(out).every((v) => v.connected && v.clean), ...out }
  })()`,
  request: `(async () => {
    try {
      const p = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.MediaPermissions
      if (!p) return { ok: false, err: 'module MediaPermissions absent' }
      const r = await p.request()
      return { ok: true, ...r }
    } catch (e) { return { ok: false, err: String(e && e.message || e) } }
  })()`,
  camera: `(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true })
      const v = document.createElement('video')
      v.autoplay = true; v.muted = true; v.playsInline = true; v.srcObject = s
      v.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:999999;background:#000'
      document.body.appendChild(v)
      await new Promise((r) => setTimeout(r, 2500))
      return { ok: true, tracks: s.getTracks().map((t) => t.kind + ':' + t.readyState), width: v.videoWidth, height: v.videoHeight }
    } catch (e) { return { ok: false, err: (e && e.name) + ' ' + (e && e.message) } }
  })()`,
}

const value = await evaluate(scripts[mode])
console.log(JSON.stringify(value))
ws.close()
process.exit(0)
