import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { PURPLE } from '../constants/colors';

type Variant = 'primary' | 'ghost' | 'outline';
type Size = 'sm' | 'md';

type Props = {
  title: string;
  onPress: () => void;
  leftIcon?: keyof typeof MaterialIcons.glyphMap;
  variant?: Variant;
  size?: Size;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
};

export default function PillButton({
  title,
  onPress,
  leftIcon,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
  disabled,
}: Props) {
  const height = size === 'sm' ? 30 : 36;
  const radius = 12;

  if (variant === 'primary') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} disabled={disabled} style={style}>
        <LinearGradient
          colors={PURPLE.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, { height, borderRadius: radius, borderWidth: 1, borderColor: PURPLE.tintBorder }]}
        >
          {leftIcon ? <MaterialIcons name={leftIcon} size={16} color="#0F1115" style={{ marginRight: 8 }} /> : null}
          <Text style={[styles.primaryText, textStyle]}>{title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const containerStyle: ViewStyle = {
    height,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: variant === 'outline' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.10)',
    backgroundColor: variant === 'ghost' ? PURPLE.tintBg : 'transparent',
  };

  const textClr = variant === 'ghost' ? '#E5E7EB' : '#E5E7EB';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} disabled={disabled} style={style}>
      <View style={[styles.base, containerStyle]}>
        {leftIcon ? <MaterialIcons name={leftIcon} size={16} color={textClr} style={{ marginRight: 8 }} /> : null}
        <Text style={[styles.ghostText, { color: textClr }, textStyle]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#0F1115',
    fontSize: 13,
    fontWeight: '800',
  },
  ghostText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
