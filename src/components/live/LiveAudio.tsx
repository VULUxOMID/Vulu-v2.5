import React, { useEffect, useMemo, useState, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { liveAgora } from '../../services/liveAgora'
import { getToken } from '../../services/liveToken'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '../../services/firebase'

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
  const mountedRef = useRef(true)

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
        liveAgora.setEvents({
          onJoinSuccess: () => { if (!mountedRef.current) return; setConnected(true); setParticipants(p => Math.max(1, p)) },
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
          },
          onUserJoined: () => { if (!mountedRef.current) return; setParticipants(p => p + 1) },
          onUserOffline: () => { if (!mountedRef.current) return; setParticipants(p => Math.max(0, p - 1)) },
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
        if (code === 0) { setConnected(true); setParticipants(p => Math.max(1, p)) }
      } catch (e: any) {
        setError(e?.message || 'Join failed')
        Alert.alert('Live Error', e?.message || 'Join failed')
      } finally {
        setConnecting(false)
      }
    }
    mountedRef.current = true
    run()
    return () => {
      mountedRef.current = false
      liveAgora.leave().catch(() => {})
    }
  }, [channel, numericUid, isHost])

  const statusText = connected ? 'CONNECTED' : connecting ? 'CONNECTING…' : 'DISCONNECTED'
  const statusColor = connected ? '#00D084' : connecting ? '#FFD700' : '#FF6B6B'

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: statusColor }] }>
        <Text style={[styles.title, { color: statusColor }]}>{statusText}</Text>
        <TouchableOpacity style={styles.close} onPress={() => { onClose?.(); }}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>Channel: {channel}</Text>
        <Text style={styles.label}>Role: {isHost ? 'Host' : 'Audience'}</Text>
        <Text style={styles.label}>Participants: {participants}</Text>
        <Text style={styles.debug}>State: {toText(connState)} Reason: {toText(connReason)}</Text>
        {error && <Text style={styles.error}>{`Error: ${String(error)}`}</Text>}
        <View style={styles.row}>
          <TouchableOpacity style={styles.button} onPress={() => liveAgora.leave()}>
            <Text style={styles.buttonText}>Leave</Text>
          </TouchableOpacity>
          {!connected && !connecting && (
            <TouchableOpacity style={[styles.button, { backgroundColor: '#444' }]} onPress={() => {
              setConnecting(true)
              setError(null)
              ;(async () => {
                try {
                  await liveAgora.leave()
                  const appId = process.env.EXPO_PUBLIC_AGORA_APP_ID || ''
                  if (!appId) throw new Error('Missing App ID')
                  await liveAgora.initialize(appId)

                  // Ensure stream doc exists (host)
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
              })()
            }}>
              <Text style={styles.buttonText}>Reconnect</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0E' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  close: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#222', borderRadius: 8 },
  closeText: { color: '#FFF' },
  body: { paddingHorizontal: 16, gap: 8 },
  label: { color: '#FFFFFF', fontSize: 14 },
  debug: { color: '#999', fontSize: 12 },
  error: { color: '#FF6B6B', marginTop: 8 },
  button: { marginTop: 16, backgroundColor: '#6E56F7', paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  buttonText: { color: '#FFF', fontWeight: '600' }
  ,row: { flexDirection: 'row', alignItems: 'center' }
  ,rowSpacing: { width: 12 }
})

export default LiveAudio