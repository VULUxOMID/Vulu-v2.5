import React, { useEffect, useMemo, useState, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, PanResponder, Animated, Image, TextInput, FlatList } from 'react-native'
import { useRouter } from 'expo-router'
import { liveAgora } from '../../services/liveAgora'
import { getToken } from '../../services/liveToken'
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, increment, deleteDoc } from 'firebase/firestore'
import { db, auth } from '../../services/firebase'
import { permissionService } from '../../services/permissionService'
import PillButton from '../PillButton'
import { PURPLE } from '../../constants/colors'
import { useMiniPlayer } from '../../context/MiniPlayerContext'

type Props = {
  channel: string
  uid: string
  isHost: boolean
  onClose?: () => void
}

export const LiveAudio: React.FC<Props> = ({ channel, uid, isHost, onClose }) => {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [participants, setParticipants] = useState<number>(0)
  const [connState, setConnState] = useState<number>(0)
  const [connReason, setConnReason] = useState<number>(0)
  const [muted, setMuted] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'viewers' | 'hosts'>('info')
  const [viewerUids, setViewerUids] = useState<number[]>([])
  const [hostAvatar, setHostAvatar] = useState<string | null>(null)
  const [hostName, setHostName] = useState<string>('Host')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<{ id: string, text: string }[]>([])
  const mountedRef = useRef(true)
  const stayConnectedRef = useRef(false)
  const pan = useRef(new Animated.ValueXY()).current
  const miniPlayer = useMiniPlayer()
  const router = useRouter()

  const attemptJoin = async () => {
    try {
      setConnecting(true)
      setError(null)
      await liveAgora.leave()
      const appId = process.env.EXPO_PUBLIC_AGORA_APP_ID || ''
      if (!appId) throw new Error('Missing App ID')
      await liveAgora.initialize(appId)
      await permissionService.initializePermissions()
      const perms = await permissionService.requestPermissions()
      if (!perms.microphone) throw new Error(permissionService.handlePermissionDenied('microphone'))
      const streamRef = doc(db, 'streams', channel)
      const snap = await getDoc(streamRef)
      if (!snap.exists() && isHost) {
        const user = auth.currentUser
        await setDoc(streamRef, {
          id: channel,
          hostId: user?.uid || 'host',
          hostName: user?.displayName || 'Host',
          hostAvatar: user?.photoURL || null,
          title: 'Live Stream',
          description: '',
          isActive: true,
          hostConnected: false,
          viewerCount: 0,
          maxViewers: 0,
          totalViewers: 0,
          participants: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          startedAt: serverTimestamp(),
          lastActivity: serverTimestamp(),
          bannedUserIds: [],
        })
      }
      const tokenData = await getToken(channel, numericUid, isHost ? 'host' : 'audience')
      const code = await liveAgora.join(channel, numericUid, isHost ? 'host' : 'audience', tokenData.token)
      if (code === 0) { setConnected(true); setParticipants(p => Math.max(1, p)) } else { throw new Error(`Join failed: ${code}`) }
    } catch (e: any) {
      setError(e?.message || 'Join failed')
    } finally {
      setConnecting(false)
    }
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 12,
      onPanResponderMove: Animated.event([null, { dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 120) {
          minimize()
        }
        pan.setValue({ x: 0, y: 0 })
      }
    })
  ).current

  const toText = (v: any) => {
    try {
      if (v == null) return ''
      const t = typeof v
      if (t === 'string' || t === 'number' || t === 'boolean') return String(v)
      return JSON.stringify(v)
    } catch {
      return '[unserializable]'
    }
  }

  const numericUid = useMemo(() => {
    let hash = 0
    for (let i = 0; i < uid.length; i++) {
      const c = uid.charCodeAt(i)
      hash = ((hash << 5) - hash) + c
      hash = hash & hash
    }
    const n = Math.abs(hash) % 2147483647
    return n === 0 ? 1 : n
  }, [uid])

  useEffect(() => {
    const run = async () => {
      try {
        setConnecting(true)
        setError(null)
        await permissionService.initializePermissions()
        const perms = await permissionService.requestPermissions()
        if (!perms.microphone) {
          const cur = await permissionService.getCurrentStatus()
          if (!cur.canAskAgain) {
            await permissionService.openSystemSettings()
          }
          setConnecting(false)
          setError(permissionService.handlePermissionDenied('microphone'))
          return
        }
        liveAgora.setEvents({
          onJoinSuccess: () => { if (!mountedRef.current) return; setConnected(true); setParticipants(p => Math.max(1, p)); if (isHost) { try { const streamRef = doc(db, 'streams', channel); updateDoc(streamRef, { hostConnected: true, updatedAt: serverTimestamp(), lastActivity: serverTimestamp() }).catch(() => {}) } catch {} } },
          onConnectionChange: (c) => { if (!mountedRef.current) return; setConnected(c) },
          onConnectionEvent: (s, r) => {
            if (!mountedRef.current) return;
            setConnState(typeof s === 'number' ? s : 0);
            setConnReason(typeof r === 'number' ? r : 0);
            if (typeof r === 'number' && (r === 8 || r === 9)) {
              setConnecting(true)
              ;(async () => {
                try {
                  const tokenData = await getToken(channel, numericUid, isHost ? 'host' : 'audience')
                  await liveAgora.renewToken(tokenData.token)
                } catch (e: any) {
                  if (!mountedRef.current) return; setError(e?.message || 'Token renewal failed')
                } finally {
                  if (!mountedRef.current) return; setConnecting(false)
                }
              })()
            }
            if (typeof s === 'number' && s === 4 && !connecting) {
              ;(async () => { await attemptJoin() })()
            }
          },
          onUserJoined: async (uid) => { if (!mountedRef.current) return; setParticipants(p => p + 1); setViewerUids(prev => Array.from(new Set([...prev, uid]))); if (isHost) { try { const streamRef = doc(db, 'streams', channel); await updateDoc(streamRef, { viewerCount: increment(1), updatedAt: serverTimestamp(), lastActivity: serverTimestamp() }); } catch {} } },
          onUserOffline: async (uid) => { if (!mountedRef.current) return; setParticipants(p => Math.max(0, p - 1)); setViewerUids(prev => prev.filter(x => x !== uid)); if (isHost) { try { const streamRef = doc(db, 'streams', channel); await updateDoc(streamRef, { viewerCount: increment(-1), updatedAt: serverTimestamp(), lastActivity: serverTimestamp() }); } catch {} } },
          onError: async (code) => {
            if (!mountedRef.current) return; setError(String(code))
            if (code === 109 || code === 110) {
              try {
                setConnecting(true)
                const tokenData = await getToken(channel, numericUid, isHost ? 'host' : 'audience')
                await liveAgora.renewToken(tokenData.token)
              } catch (e: any) {
                if (!mountedRef.current) return; setError(e?.message || 'Token renewal failed')
              } finally {
                if (!mountedRef.current) return; setConnecting(false)
              }
            }
          }
        })
        const appId = process.env.EXPO_PUBLIC_AGORA_APP_ID || ''
        if (!appId) {
          throw new Error('Missing App ID')
        }
        await liveAgora.initialize(appId)

        // Ensure a stream document exists for token validation (backend requires it)
        const streamRef = doc(db, 'streams', channel)
        const snap = await getDoc(streamRef)
        if (!snap.exists() && isHost) {
          const user = auth.currentUser
          await setDoc(streamRef, {
            id: channel,
            hostId: user?.uid || 'host',
            hostName: user?.displayName || 'Host',
            hostAvatar: user?.photoURL || null,
            title: 'Live Stream',
            description: '',
            isActive: true,
            hostConnected: false,
            viewerCount: 0,
            maxViewers: 0,
            totalViewers: 0,
            participants: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            startedAt: serverTimestamp(),
            lastActivity: serverTimestamp(),
            bannedUserIds: [],
          })
        }
        const streamData = (snap.exists() ? snap.data() : null) as any
        if (streamData) {
          setHostAvatar(streamData.hostAvatar || null)
          setHostName(streamData.hostName || 'Host')
        }

        if (liveAgora.isJoined() && liveAgora.getJoinedChannelId() === channel) {
          setConnected(true)
          setParticipants(p => Math.max(1, p))
        } else {
          const tokenData = await getToken(channel, numericUid, isHost ? 'host' : 'audience')
          const code = await liveAgora.join(channel, numericUid, isHost ? 'host' : 'audience', tokenData.token)
          if (code === 0) { setConnected(true); setParticipants(p => Math.max(1, p)) }
        }
      } catch (e: any) {
        setError(e?.message || 'Join failed')
        Alert.alert('Live Error', e?.message || 'Join failed')
      } finally {
        setConnecting(false)
      }
    }
    mountedRef.current = true
    run()
    let heartbeat: any
    if (isHost) {
      heartbeat = setInterval(() => {
        if (!mountedRef.current) return
        if (connected) {
          const streamRef = doc(db, 'streams', channel)
          updateDoc(streamRef, { lastActivity: serverTimestamp(), updatedAt: serverTimestamp() }).catch(() => {})
        }
      }, 20000)
    }
    return () => {
      mountedRef.current = false
      if (!stayConnectedRef.current) {
        ;(async () => {
          try { await liveAgora.leave() } catch {}
          if (isHost) {
            try { const streamRef = doc(db, 'streams', channel); await updateDoc(streamRef, { isActive: false, hostConnected: false, updatedAt: serverTimestamp(), endedAt: serverTimestamp() }) } catch {}
          }
        })()
      }
      if (heartbeat) { try { clearInterval(heartbeat) } catch {} }
    }
  }, [channel, numericUid, isHost])

  const minimize = () => {
    stayConnectedRef.current = true
    const status = connected ? 'connected' : connecting ? 'connecting' : 'disconnected'
    miniPlayer.setOnExitCallback(async (sid) => {
      try { await liveAgora.leave() } catch {}
      if (isHost && sid) {
        try {
          const streamRef = doc(db, 'streams', sid)
          await updateDoc(streamRef, { isActive: false, hostConnected: false, updatedAt: serverTimestamp(), endedAt: serverTimestamp() })
        } catch {
          try { await deleteDoc(doc(db, 'streams', sid)) } catch {}
        }
      }
    })
    miniPlayer.showMiniPlayer(channel, isHost ? 'Live (Host)' : 'Live (Audience)', String(participants), status as any)
    onClose?.()
    try { router.replace('/') } catch {}
  }

  const leaveSession = async () => {
    stayConnectedRef.current = false
    try {
      await liveAgora.leave()
    } catch {}
    try {
      miniPlayer.hideMiniPlayer()
    } catch {}
    if (isHost) {
      try {
        const streamRef = doc(db, 'streams', channel)
        await updateDoc(streamRef, { isActive: false, hostConnected: false, updatedAt: serverTimestamp(), endedAt: serverTimestamp() })
      } catch {
        try { await deleteDoc(doc(db, 'streams', channel)) } catch {}
      }
    }
    setConnected(false)
    setParticipants(0)
    onClose?.()
    try { router.replace('/') } catch {}
  }

  const statusText = connected ? 'CONNECTED' : connecting ? 'CONNECTING…' : 'DISCONNECTED'
  const statusColor = connected ? '#00D084' : connecting ? '#FFD700' : '#FF6B6B'

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, { borderBottomColor: statusColor }]} {...panResponder.panHandlers}>
        <View style={styles.headerLeft}>
          {hostAvatar ? (
            <Image source={{ uri: hostAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: PURPLE.tintBg }]} />
          )}
          <View>
            <Text style={styles.hostName}>{hostName}</Text>
            <Text style={[styles.title, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <PillButton title="Minimize" leftIcon="arrow-downward" size="sm" onPress={minimize} />
          <TouchableOpacity style={styles.close} onPress={() => { onClose?.(); }}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      <View style={styles.body}>
        <Text style={styles.label}>Channel: {channel}</Text>
        <Text style={styles.label}>Role: {isHost ? 'Host' : 'Audience'}</Text>
        <Text style={styles.label}>Participants: {participants}</Text>
        <Text style={styles.debug}>State: {toText(connState)} Reason: {toText(connReason)}</Text>
        {error && <Text style={styles.error}>{`Error: ${String(error)}`}</Text>}

        <View style={styles.tabs}>
          {(['info','viewers','hosts'] as const).map(t => (
            <TouchableOpacity key={t} onPress={() => setActiveTab(t)} style={[styles.tab, activeTab === t && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'info' && (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>Live audio stream. Use the controls below to manage your session.</Text>
          </View>
        )}
        {activeTab === 'viewers' && (
          <FlatList
            data={viewerUids.map(v => ({ id: String(v) }))}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.listItem}><Text style={styles.label}>Viewer #{item.id}</Text></View>
            )}
            ListEmptyComponent={<Text style={styles.debug}>No viewers yet</Text>}
            style={{ maxHeight: 160 }}
          />
        )}
        {activeTab === 'hosts' && (
          <View style={styles.listItem}><Text style={styles.label}>{hostName}</Text></View>
        )}

        <View style={styles.chatBox}>
          <FlatList
            data={chatMessages}
            keyExtractor={m => m.id}
            renderItem={({ item }) => (<Text style={styles.chatMsg}>• {item.text}</Text>)}
            ListEmptyComponent={<Text style={styles.debug}>Chat here…</Text>}
          />
          <View style={styles.chatInputRow}>
            <TextInput value={chatInput} onChangeText={setChatInput} placeholder="Type a message" placeholderTextColor="#777" style={styles.chatInput} />
            <PillButton title="Send" size="sm" onPress={() => { if (chatInput.trim()) { setChatMessages(prev => [{ id: String(Date.now()), text: chatInput.trim() }, ...prev]); setChatInput('') } }} />
          </View>
        </View>

        <View style={styles.controlBar}>
          <PillButton title={muted ? 'Unmute' : 'Mute'} leftIcon={muted ? 'mic' : 'mic-off'} onPress={async () => { const next = !muted; setMuted(next); await liveAgora.setMute(next) }} />
          <PillButton title="Minimize" leftIcon="arrow-downward" onPress={minimize} />
          <PillButton title="Leave" leftIcon="logout" variant="outline" onPress={leaveSession} />
      </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0E', paddingTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, backgroundColor: '#101217' },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: PURPLE.tintBorder },
  hostName: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  close: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: PURPLE.tintBg, borderRadius: 8, borderWidth: 1, borderColor: PURPLE.tintBorder },
  closeText: { color: '#FFF' },
  body: { paddingHorizontal: 16, gap: 8, paddingBottom: 90 },
  label: { color: '#FFFFFF', fontSize: 14 },
  debug: { color: '#999', fontSize: 12 },
  error: { color: '#FF6B6B', marginTop: 8 },
  button: { marginTop: 16, backgroundColor: '#6E56F7', paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  buttonText: { color: '#FFF', fontWeight: '600' }
  ,row: { flexDirection: 'row', alignItems: 'center' }
  ,rowSpacing: { width: 12 }
  ,tabs: { flexDirection: 'row', gap: 8, marginTop: 8 }
  ,tab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }
  ,tabActive: { backgroundColor: PURPLE.tintBg, borderColor: PURPLE.tintBorder }
  ,tabText: { color: '#BBB', fontSize: 11, fontWeight: '700' }
  ,tabTextActive: { color: '#FFF' }
  ,infoCard: { backgroundColor: '#14161D', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12 }
  ,infoText: { color: '#DDD' }
  ,listItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }
  ,chatBox: { position: 'absolute', left: 16, right: 16, bottom: 60, backgroundColor: '#0F1115', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 10 }
  ,chatMsg: { color: '#EEE', fontSize: 12, marginBottom: 6 }
  ,chatInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 }
  ,chatInput: { flex: 1, backgroundColor: '#1D1E26', color: '#FFF', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 }
  ,controlBar: { position: 'absolute', left: 0, right: 0, bottom: 10, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
})

export default LiveAudio