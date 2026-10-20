import { Capacitor, registerPlugin } from '@capacitor/core'
import { api } from '@/services'
import type { LiveSignal } from '@/types'

/**
 * Direct caméra intégré (WebRTC) : l'hôte envoie sa caméra à chaque spectateur.
 * La mise en relation passe par l'API (signaux join / offer / answer / leave),
 * la vidéo circule ensuite directement entre les appareils.
 */

const POLL_MS = 1500

function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]
  // Serveur relais optionnel (réseaux mobiles stricts) : VITE_TURN_URL, VITE_TURN_USER, VITE_TURN_PASS.
  const turn = import.meta.env.VITE_TURN_URL as string | undefined
  if (turn) {
    servers.push({
      urls: turn.split(',').map((u) => u.trim()),
      username: import.meta.env.VITE_TURN_USER as string | undefined,
      credential: import.meta.env.VITE_TURN_PASS as string | undefined,
    })
  }
  return servers
}

/** Attend la fin de la collecte des candidats réseau (au plus 3 s) : un seul message suffit. */
function waitForIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener('icegatheringstatechange', check)
      resolve()
    }
    const check = () => pc.iceGatheringState === 'complete' && done()
    pc.addEventListener('icegatheringstatechange', check)
    window.setTimeout(done, 3000)
  })
}

interface MediaPermissionsPlugin {
  check(): Promise<{ camera: string; microphone: string }>
  request(): Promise<{ camera: string; microphone: string }>
  openSettings(): Promise<void>
}

/** Module natif Android (MainActivity) : autorisations caméra et micro. */
const MediaPermissions = registerPlugin<MediaPermissionsPlugin>('MediaPermissions')

/** Erreur caméra ; `blocked` = refus définitif, il faut passer par les réglages du téléphone. */
export class CameraError extends Error {
  constructor(
    message: string,
    public blocked = false,
  ) {
    super(message)
  }
}

/** Ouvre les réglages de FitLife (autorisations) sur le téléphone. */
export function openAppSettings(): void {
  if (Capacitor.isNativePlatform()) MediaPermissions.openSettings().catch(() => undefined)
}

/** Sur Android, demande d'abord les autorisations système (fenêtre « Autoriser »). */
async function ensureNativePermissions(): Promise<{ camera: boolean; microphone: boolean }> {
  if (!Capacitor.isNativePlatform()) return { camera: true, microphone: true }
  try {
    const res = await MediaPermissions.request()
    return { camera: res.camera === 'granted', microphone: res.microphone === 'granted' }
  } catch {
    // Module absent (ancienne version) : on laisse la WebView demander elle-même.
    return { camera: true, microphone: true }
  }
}

/** Demande la caméra et le micro (frontale par défaut). Sans micro autorisé, la vidéo seule est diffusée. */
export async function openCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraError('Cet appareil ne permet pas d’utiliser la caméra dans l’application.')
  }
  const perms = await ensureNativePermissions()
  if (!perms.camera) {
    throw new CameraError(
      'FitLife n’a pas l’autorisation d’utiliser la caméra. Ouvre les réglages, puis Autorisations > Caméra > Autoriser.',
      true,
    )
  }
  const video = { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
  const audio = { echoCancellation: true, noiseSuppression: true }
  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio: perms.microphone ? audio : false })
  } catch (err) {
    const name = err instanceof DOMException ? err.name : ''
    // Micro indisponible ou refusé : on tente la caméra seule.
    if (perms.microphone && (name === 'NotAllowedError' || name === 'NotReadableError' || name === 'NotFoundError')) {
      try {
        return await navigator.mediaDevices.getUserMedia({ video, audio: false })
      } catch {
        /* on garde l'erreur d'origine */
      }
    }
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      throw new CameraError(
        Capacitor.isNativePlatform()
          ? 'Accès à la caméra refusé. Ouvre les réglages, puis Autorisations > Caméra et Micro > Autoriser.'
          : 'Accès à la caméra refusé par le navigateur. Autorise la caméra pour ce site (icône à gauche de l’adresse).',
        Capacitor.isNativePlatform(),
      )
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      throw new CameraError('Aucune caméra disponible sur cet appareil.')
    }
    if (name === 'NotReadableError') {
      throw new CameraError('La caméra est déjà utilisée par une autre application. Ferme-la puis réessaie.')
    }
    throw new CameraError('Impossible d’ouvrir la caméra.')
  }
}

/** Côté hôte : répond à chaque spectateur qui rejoint le direct. */
export class LiveHost {
  private peers = new Map<string, RTCPeerConnection>()
  private timer = 0
  private stopped = false

  constructor(
    private liveId: string,
    private stream: MediaStream,
    private onViewers?: (count: number) => void,
  ) {
    this.timer = window.setInterval(() => void this.poll(), POLL_MS)
    void this.poll()
  }

  private connectedCount(): number {
    return [...this.peers.values()].filter((pc) => pc.connectionState === 'connected').length
  }

  private async poll(): Promise<void> {
    if (this.stopped) return
    let signals: LiveSignal[] = []
    try {
      signals = await api.getLiveSignals(this.liveId)
    } catch {
      return
    }
    for (const s of signals) {
      try {
        if (s.kind === 'join') await this.offerTo(s.from)
        else if (s.kind === 'answer') await this.peers.get(s.from)?.setRemoteDescription(s.payload as RTCSessionDescriptionInit)
        else if (s.kind === 'leave') this.drop(s.from)
      } catch {
        this.drop(s.from)
      }
    }
  }

  private async offerTo(viewerId: string): Promise<void> {
    this.drop(viewerId)
    const pc = new RTCPeerConnection({ iceServers: iceServers() })
    this.peers.set(viewerId, pc)
    this.stream.getTracks().forEach((t) => pc.addTrack(t, this.stream))
    pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') this.drop(viewerId)
      this.onViewers?.(this.connectedCount())
    })
    await pc.setLocalDescription(await pc.createOffer())
    await waitForIce(pc)
    await api.sendLiveSignal(this.liveId, viewerId, 'offer', pc.localDescription?.toJSON())
  }

  private drop(viewerId: string): void {
    const pc = this.peers.get(viewerId)
    if (!pc) return
    this.peers.delete(viewerId)
    pc.close()
    this.onViewers?.(this.connectedCount())
  }

  stop(): void {
    this.stopped = true
    window.clearInterval(this.timer)
    for (const id of [...this.peers.keys()]) this.drop(id)
  }
}

export type ViewerState = 'connecting' | 'connected' | 'failed'

/** Côté spectateur : rejoint le direct de l'hôte et reçoit sa vidéo. */
export class LiveViewer {
  private pc: RTCPeerConnection | null = null
  private timer = 0
  private lastJoin = 0
  private stopped = false

  constructor(
    private liveId: string,
    private hostId: string,
    private onStream: (stream: MediaStream) => void,
    private onState: (state: ViewerState) => void,
  ) {
    this.onState('connecting')
    this.timer = window.setInterval(() => void this.tick(), POLL_MS)
    void this.tick()
  }

  private async tick(): Promise<void> {
    if (this.stopped) return
    const state = this.pc?.connectionState
    // Pas encore connecté : (re)demande l'image à l'hôte toutes les 8 s.
    if (state !== 'connected' && state !== 'connecting' && Date.now() - this.lastJoin > 8000) {
      this.lastJoin = Date.now()
      api.sendLiveSignal(this.liveId, this.hostId, 'join').catch(() => undefined)
    }
    let signals: LiveSignal[] = []
    try {
      signals = await api.getLiveSignals(this.liveId)
    } catch {
      return
    }
    for (const s of signals) {
      if (s.kind === 'offer' && s.from === this.hostId) await this.answer(s.payload as RTCSessionDescriptionInit).catch(() => undefined)
    }
  }

  private async answer(offer: RTCSessionDescriptionInit): Promise<void> {
    this.pc?.close()
    const pc = new RTCPeerConnection({ iceServers: iceServers() })
    this.pc = pc
    pc.addEventListener('track', (e) => {
      const [stream] = e.streams
      if (stream) this.onStream(stream)
    })
    pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'connected') this.onState('connected')
      if (pc.connectionState === 'failed') {
        this.onState('failed')
        this.lastJoin = 0 // nouvelle tentative au prochain tour
      }
    })
    await pc.setRemoteDescription(offer)
    await pc.setLocalDescription(await pc.createAnswer())
    await waitForIce(pc)
    await api.sendLiveSignal(this.liveId, this.hostId, 'answer', pc.localDescription?.toJSON())
  }

  stop(): void {
    this.stopped = true
    window.clearInterval(this.timer)
    api.sendLiveSignal(this.liveId, this.hostId, 'leave').catch(() => undefined)
    this.pc?.close()
    this.pc = null
  }
}
