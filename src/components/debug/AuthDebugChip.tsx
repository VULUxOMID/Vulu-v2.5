import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';

// Temporary on-screen auth debug chip (TestFlight safe)
// Shows auto-login attempt/result and whether credentials exist
const AuthDebugChip: React.FC = () => {
  const { autoLoginDebug } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const bgColor = useMemo(() => {
    switch (autoLoginDebug.status) {
      case 'attempting':
        return '#1E90FF'; // blue
      case 'success':
        return '#2E8B57'; // green
      case 'failed':
        return '#B22222'; // red
      case 'no-credentials':
        return '#FF8C00'; // orange
      default:
        return '#696969'; // gray
    }
  }, [autoLoginDebug.status]);

  const label = `Auto-login: ${autoLoginDebug.status} • saved: ${autoLoginDebug.hasSavedCredentials ? 'yes' : autoLoginDebug.hasSavedCredentials === false ? 'no' : 'unknown'}`;

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => setExpanded(!expanded)} style={[styles.container, { backgroundColor: bgColor }]}> 
      <Text style={styles.text}>{label}</Text>
      {expanded && autoLoginDebug.lastError ? (
        <Text style={[styles.text, styles.subText]}>Last error: {autoLoginDebug.lastError}</Text>
      ) : null}
      {expanded && !autoLoginDebug.attempted ? (
        <Text style={[styles.text, styles.subText]}>Not attempted yet this session</Text>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    bottom: 24,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 9999,
    elevation: 6,
    maxWidth: '90%',
  },
  text: {
    color: 'white',
    fontSize: 12,
  },
  subText: {
    marginTop: 4,
    opacity: 0.9,
  }
});

export default AuthDebugChip;

