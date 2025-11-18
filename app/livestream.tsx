import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import LiveAudio from '../src/components/live/LiveAudio';

export default function LiveStream() {
  const params = useLocalSearchParams() as Record<string, string>
  const channel = typeof params.streamId === 'string' ? params.streamId : `live_${Date.now()}`
  const uid = typeof params.hostId === 'string' ? params.hostId : 'guest'
  const isHost = params.isHost === 'true'

  return (
    <View style={styles.container}>
      <LiveAudio channel={channel} uid={uid} isHost={isHost} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});