import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { permissionService } from '../../services/permissionService'
import { useAuth } from '../../context/AuthContext'
import { useLiveStreams } from '../../context/LiveStreamContext'

type Props = {
  onCancel: () => void
  onStart: (channel: string) => void
}

const LiveSetup: React.FC<Props> = ({ onCancel, onStart }) => {
  const { user } = useAuth()
  const { createNewStream } = useLiveStreams()
  const [title, setTitle] = useState('Live Stream')
  const [checking, setChecking] = useState(false)
  const [granted, setGranted] = useState(false)
  const [canAskAgain, setCanAskAgain] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    ;(async () => {
      setChecking(true)
      setError(null)
      await permissionService.initializePermissions()
      const status = await permissionService.requestPermissions()
      setGranted(!!status.microphone)
      const cur = await permissionService.getCurrentStatus()
      setCanAskAgain(cur.canAskAgain)
      setChecking(false)
    })()
  }, [])

  const requestAgain = async () => {
    setChecking(true)
    setError(null)
    const status = await permissionService.requestPermissions()
    setGranted(!!status.microphone)
    const cur = await permissionService.getCurrentStatus()
    setCanAskAgain(cur.canAskAgain)
    setChecking(false)
    if (!status.microphone) {
      setError(permissionService.handlePermissionDenied('microphone'))
    }
    if (status.microphone) {
      await startLive()
    }
  }

  const startLive = async () => {
    if (!user) { setError('Sign in required'); return }
    if (!granted) { setError('Microphone permission required'); return }
    try {
      setStarting(true)
      const channel = await createNewStream(title, user.uid, user.displayName || 'Host', user.photoURL || '')
      onStart(channel)
    } catch (e: any) {
      setError(e?.message || 'Failed to start live')
    } finally {
      setStarting(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Go Live</Text>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Stream title" placeholderTextColor="#777" />
      <View style={styles.permissionRow}>
        <Text style={styles.label}>Microphone</Text>
        {checking ? <ActivityIndicator color="#fff" /> : (
          <TouchableOpacity
            style={[styles.permBtn, { backgroundColor: granted ? '#00D084' : (canAskAgain ? '#FF6B6B' : '#FFD700') }]}
            onPress={granted ? startLive : (canAskAgain ? requestAgain : permissionService.openSystemSettings)}
          >
            <Text style={styles.permText}>{granted ? 'Continue' : (canAskAgain ? 'Request' : 'Open Settings')}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onCancel}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { opacity: granted ? 1 : 0.6 }]} disabled={!granted || starting} onPress={startLive}>
          <Text style={styles.buttonText}>{starting ? 'Starting…' : 'Start Live'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0E', padding: 16 },
  heading: { color: '#FFF', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  label: { color: '#CCC', marginBottom: 6 },
  input: { backgroundColor: '#1D1E26', color: '#FFF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 12 },
  permissionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  permBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  permText: { color: '#000', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  button: { backgroundColor: '#6E56F7', paddingVertical: 10, borderRadius: 8, alignItems: 'center', flex: 1 },
  cancel: { backgroundColor: '#333' },
  buttonText: { color: '#FFF', fontWeight: '600' },
  error: { color: '#FF6B6B', marginTop: 8 }
})

export default LiveSetup