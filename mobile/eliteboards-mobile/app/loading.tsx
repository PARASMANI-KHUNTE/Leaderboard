import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, Image, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

type StarSpec = {
  id: number;
  leftPct: number;
  topPct: number;
  size: number;
  delayMs: number;
  duration: number;
};

const LOADING_MESSAGES = [
  "INITIALIZING_QUANTUM_LEADERS...",
  "SYNCING_REALTIME_ENGINES...",
  "OPTIMIZING_PREMIUM_RANKINGS...",
  "VERIFYING_SECURE_SESSIONS...",
  "CALIBRATING_ELITE_METRICS...",
  "LOADING_SUCCESS_PATTERNS...",
];

function Star({ spec }: { spec: StarSpec }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(spec.delayMs),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: Math.random() * 0.7 + 0.3,
            duration: spec.duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: spec.duration / 2,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: spec.duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0,
            duration: spec.duration / 2,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [spec.duration, spec.delayMs]);

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: `${spec.leftPct}%`,
          top: `${spec.topPct}%`,
          width: spec.size,
          height: spec.size,
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <View style={[styles.starDot, { width: spec.size, height: spec.size }]} />
    </Animated.View>
  );
}

export default function Loading() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  
  const [msgIndex, setMsgIndex] = useState(0);
  const msgOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initial entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0.6,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(progressWidth, {
        toValue: 1,
        duration: 4000,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false, // width doesn't support native driver
      }),
    ]).start();

    // Loop for "breathing" logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Loop for changing messages
    const msgInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(msgOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.delay(100),
      ]).start(() => {
        setMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        Animated.timing(msgOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    }, 2800);

    return () => clearInterval(msgInterval);
  }, []);

  const stars = useMemo<StarSpec[]>(() => 
    Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      leftPct: Math.random() * 100,
      topPct: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delayMs: Math.random() * 3000,
      duration: Math.random() * 3000 + 2000,
    })), 
  []);

  return (
    <View style={styles.container}>
      {/* Background Decor */}
      <View style={StyleSheet.absoluteFill}>
        {stars.map((s) => <Star key={s.id} spec={s} />)}
      </View>

      {/* Central Glow */}
      <Animated.View 
        style={[
          styles.radialGlow, 
          { opacity: glowOpacity, transform: [{ scale: logoScale }] }
        ]} 
      />

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Animated.View style={{ transform: [{ scale: logoScale }] }}>
          <Image 
            source={require('../assets/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <View style={styles.textWrap}>
          <Text style={styles.brandTitle}>EliteBoards</Text>
          <Text style={styles.brandTagline}>PREMIUM ACADEMIC RANKINGS</Text>
        </View>

        {/* Progress System */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <Animated.View 
              style={[
                styles.progressBarFill, 
                { 
                  width: progressWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '85%']
                  }) 
                }
              ]} 
            />
          </View>
          <Animated.Text style={[styles.statusText, { opacity: msgOpacity }]}>
            {LOADING_MESSAGES[msgIndex]}
          </Animated.Text>
        </View>
      </Animated.View>

      {/* Footer Branding */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>POWERED BY ELITEBOARD ARCHITECTURE</Text>
        <Text style={styles.versionText}>V1.0.4-STABLE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialGlow: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 100,
    elevation: 20,
  },
  content: {
    alignItems: 'center',
    zIndex: 10,
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 20,
  },
  textWrap: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brandTitle: {
    color: '#e2e8f0',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
    textTransform: 'uppercase',
  },
  brandTagline: {
    color: 'rgba(99, 102, 241, 0.6)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 4,
  },
  progressContainer: {
    width: width * 0.7,
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  statusText: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'System',
    textAlign: 'center',
    height: 20,
  },
  star: {
    position: 'absolute',
  },
  starDot: {
    backgroundColor: 'white',
    borderRadius: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(71, 85, 105, 0.6)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  versionText: {
    color: 'rgba(71, 85, 105, 0.4)',
    fontSize: 7,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 1,
  },
});

