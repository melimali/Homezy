import { useEffect, useState } from 'react';
import { Animated, Text, type StyleProp, type TextStyle } from 'react-native';

type Props = {
  value: number;
  style?: StyleProp<TextStyle>;
  prefix?: string;
  suffix?: string;
};

/** Sayı değiştikçe sıçrayarak ve sayarak artan/azalan canlı sayı bileşeni. */
export function AnimatedNumber({ value, style, prefix = '', suffix = '' }: Props) {
  const [displayValue, setDisplayValue] = useState(value);
  const [anim] = useState(() => new Animated.Value(value));

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value,
      friction: 7,
      tension: 100,
      useNativeDriver: false,
    }).start();

    const listener = anim.addListener(({ value: v }) => {
      setDisplayValue(Math.round(v));
    });

    return () => anim.removeListener(listener);
  }, [value, anim]);

  return (
    <Text style={style}>
      {prefix}{displayValue}{suffix}
    </Text>
  );
}
