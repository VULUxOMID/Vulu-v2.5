import React from 'react';
import { Text } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  text: string | number;
  textStyle?: any;
  colors?: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
};

export default function GradientText({
  text,
  textStyle,
  colors = ['#F5C044', '#D8922B', '#A96A1B'],
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
}: Props) {
  return (
    <MaskedView maskElement={<Text style={textStyle}>{text}</Text>}>
      <LinearGradient colors={colors} start={start} end={end}>
        <Text style={[textStyle, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}
