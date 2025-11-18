import React, { useEffect, useMemo, useState } from 'react'
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
          onJoinSuccess: () => setConnected(true),
          onConnectionChange: (c) => setConnected(c),
          onUserJoined: () => setParticipants(p => p + 1),
          onUserOffline: () => setParticipants(p => Math.max(0, p - 1)),
          onError: (code) => setError(String(code))
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
        await liveAgora.join(channel, numericUid, isHost ? 'host' : 'audience', tokenData.token)
      } catch (e: any) {
        setError(e?.message || 'Join failed')
        Alert.alert('Live Error', e?.message || 'Join failed')
      } finally {
        setConnecting(false)
      }
    }
    run()
    return () => {
      liveAgora.leave().catch(() => {})
    }
  }, [channel, numericUid, isHost])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{connected ? 'LIVE' : connecting ? 'CONNECTING…' : 'DISCONNECTED'}</Text>
        <TouchableOpacity style={styles.close} onPress={() => { onClose?.(); }}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>Channel: {channel}</Text>
        <Text style={styles.label}>Role: {isHost ? 'Host' : 'Audience'}</Text>
        <Text style={styles.label}>Participants: {participants}</Text>
        {error && <Text style={styles.error}>Error: {error}</Text>}
        <TouchableOpacity style={styles.button} onPress={() => liveAgora.leave()}>
          <Text style={styles.buttonText}>Leave</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0E' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  close: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#222', borderRadius: 8 },
  closeText: { color: '#FFF' },
  body: { paddingHorizontal: 16, gap: 8 },
  label: { color: '#FFFFFF', fontSize: 14 },
  error: { color: '#FF6B6B', marginTop: 8 },
  button: { marginTop: 16, backgroundColor: '#6E56F7', paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  buttonText: { color: '#FFF', fontWeight: '600' }
})

export default LiveAudio