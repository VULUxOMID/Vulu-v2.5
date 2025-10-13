import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  text: number | string;
  textStyle?: any;
  baseColors?: string[];
  shimmerColors?: string[];
  duration?: number;
  triggerKey?: number | string;
};

export default function ShimmeringGradientText({
  text,
  textStyle,
  baseColors = ['#F5C044', '#D8922B', '#A96A1B'],
  shimmerColors = ['#FFFFFF00', '#FFFFFF66', '#FFFFFF00'],
  duration = 900,
  triggerKey,
}: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  const run = () => {
    if (!w) return;
    translateX.setValue(-w);
    Animated.timing(translateX, { toValue: w, duration, useNativeDriver: true }).start();
  };

  useEffect(() => { run(); }, [w, triggerKey]);

  return (
    <MaskedView maskElement={<Text style={[styles.text, textStyle]}>{text}</Text>}>
      <LinearGradient colors={baseColors}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0, bottom: 0,
            width: Math.max(40, w * 0.35),
            transform: [{ translateX }],
          }}
        >
          <LinearGradient colors={shimmerColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </Animated.View>
        <Text onLayout={onLayout} style={[styles.text, textStyle, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 24, fontWeight: 'bold' },
});
