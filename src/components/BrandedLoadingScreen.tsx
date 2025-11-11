import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

interface BrandedLoadingScreenProps {
  message?: string;
}

/**
 * Beautiful, modern loading screen with VuluGO branding
 * Designed to show for minimal time (<500ms) while auth state is determined
 */
export default function BrandedLoadingScreen({ message = 'Loading...' }: BrandedLoadingScreenProps) {
  // Animation values
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation (quick)
    Animated.timing(fadeValue, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Continuous spin animation for the outer ring
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Continuous pulse animation for the logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Interpolate rotation
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeValue }]}>
      {/* Main content container */}
      <View style={styles.content}>
        {/* Spinning outer ring */}
        <Animated.View
          style={[
            styles.spinnerRing,
            {
              transform: [{ rotate: spin }],
            },
          ]}
        >
          <View style={styles.ringSegment1} />
          <View style={styles.ringSegment2} />
        </Animated.View>

        {/* Pulsing logo container */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: pulseValue }],
            },
          ]}
        >
          {/* VuluGO Logo Text */}
          <Text style={styles.logoText}>VULU</Text>
          <Text style={styles.logoSubtext}>GO</Text>
        </Animated.View>
      </View>

      {/* Loading message */}
      <Text style={styles.message}>{message}</Text>

      {/* Subtle brand tagline (optional) */}
      <Text style={styles.tagline}>Your Social Experience</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318', // Match app background
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    position: 'relative',
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  spinnerRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringSegment1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#6E69F4', // Primary brand color
    borderRightColor: '#6E69F4',
  },
  ringSegment2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'transparent',
    borderBottomColor: '#8B86FF', // Lighter shade
    borderLeftColor: '#8B86FF',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(110, 105, 244, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  logoSubtext: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6E69F4',
    letterSpacing: 4,
    marginTop: -4,
  },
  message: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 8,
    fontWeight: '500',
  },
  tagline: {
    fontSize: 12,
    color: '#8F8F8F',
    opacity: 0.6,
    marginTop: 8,
    fontWeight: '400',
    letterSpacing: 1,
  },
});

