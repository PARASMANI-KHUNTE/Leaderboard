import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

type StarSpec = {
  id: number;
  leftPct: number;
  size: number;
  delayMs: number;
  rotDeg: number;
};

function Star({ spec }: { spec: StarSpec }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;
  const rotate = useRef(new Animated.Value(0)).current; // 0..1

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(spec.delayMs),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.15,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(rotate, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -26,
            duration: 650,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.25,
            duration: 650,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 180,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.6,
            duration: 180,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(rotate, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [opacity, translateY, scale, rotate, spec.delayMs, spec.rotDeg]);

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: `${spec.leftPct}%`,
          width: spec.size,
          height: spec.size,
          opacity,
          transform: [
            { translateY },
            { scale },
            { rotate: rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${spec.rotDeg}deg`] }) },
          ],
        },
      ]}
    >
      <Text style={{ fontSize: spec.size, lineHeight: spec.size }}>⭐</Text>
    </Animated.View>
  );
}

export default function Loading() {
  const stars = useMemo<StarSpec[]>(
    () =>
      Array.from({ length: 10 }).map((_, i) => {
        const leftPct = 10 + Math.random() * 80;
        const size = 16 + Math.random() * 18;
        const delayMs = i * 160 + Math.random() * 180;
        const rotDeg = -90 + Math.random() * 180;
        return { id: i, leftPct, size, delayMs, rotDeg };
      }),
    []
  );

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>⭐</Text>
        </View>
        <Text style={styles.logoTitle}>EliteBoards</Text>
        <Text style={styles.logoSub}>PREMIUM RANKINGS</Text>
      </View>

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {stars.map((spec) => (
          <Star key={spec.id} spec={spec} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: 'rgba(79, 70, 229, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoEmoji: {
    fontSize: 44,
    includeFontPadding: false,
  },
  logoTitle: {
    color: '#c7d2fe',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  logoSub: {
    color: 'rgba(99, 102, 241, 0.55)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: 4,
  },
  star: {
    position: 'absolute',
    top: '44%',
    marginLeft: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

