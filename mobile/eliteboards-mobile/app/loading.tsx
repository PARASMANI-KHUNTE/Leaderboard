import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

type Particle = {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
};

const STATUS_MESSAGES = [
  'INITIALIZING_SYSTEMS...',
  'CONNECTING_TO_SERVERS...',
  'LOADING_LEADERBOARDS...',
  'SYNCING_REALTIME_DATA...',
  'OPTIMIZING_RANKINGS...',
  'ALMOST_READY...',
];

function Particle({ particle }: { particle: Particle }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(particle.delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: particle.duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: particle.duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: particle.duration,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 20,
            duration: particle.duration,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, [particle]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: particle.left,
          top: particle.top,
          width: particle.size,
          height: particle.size,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    />
  );
}

function LoadingDots() {
  const [dots, setDots] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => (d + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <Text style={styles.loadingDots}>
      {'.'.repeat(dots)}
    </Text>
  );
}

export default function Loading() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(30)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const shieldPulse = useRef(new Animated.Value(1)).current;
  
  const [msgIndex, setMsgIndex] = useState(0);
  const msgOpacity = useRef(new Animated.Value(1)).current;

  const particles = useMemo<Particle[]>(() => 
    Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: Math.random() * width,
      top: height * 0.2 + Math.random() * (height * 0.5),
      size: Math.random() * 4 + 2,
      duration: Math.random() * 2000 + 2000,
      delay: Math.random() * 3000,
    })), 
  []);

  useEffect(() => {
    // Phase 1: Logo entrance
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(ringScale, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0.6,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Phase 2: Content reveal
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 600,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 600,
          delay: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(lineWidth, {
          toValue: 1,
          duration: 1200,
          delay: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    ]).start();

    // Glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Shield pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(shieldPulse, {
          toValue: 1.1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shieldPulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Message rotation
    const msgInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(msgOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMsgIndex(prev => (prev + 1) % STATUS_MESSAGES.length);
        Animated.timing(msgOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }, 2000);

    return () => clearInterval(msgInterval);
  }, []);

  return (
    <View style={styles.container}>
      {/* Background gradient overlay */}
      <View style={styles.bgGradient} />
      
      {/* Floating particles */}
      {particles.map(p => (
        <Particle key={p.id} particle={p} />
      ))}

      {/* Animated rings */}
      <Animated.View
        style={[
          styles.ring,
          styles.ring1,
          {
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          styles.ring2,
          {
            opacity: Animated.multiply(ringOpacity, 0.5),
            transform: [{ scale: Animated.multiply(ringScale, 1.3) }],
          },
        ]}
      />

      {/* Main content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Logo container with glow */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          {/* Glow effect */}
          <Animated.View
            style={[
              styles.logoGlow,
              {
                opacity: Animated.multiply(glowAnim, 0.4),
              },
            ]}
          />
          
          {/* Shield badge */}
          <Animated.View
            style={[
              styles.shieldBadge,
              {
                transform: [{ scale: shieldPulse }],
              },
            ]}
          >
            <Text style={styles.shieldEmoji}>🏆</Text>
          </Animated.View>
        </Animated.View>

        {/* Brand text */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
        >
          <View style={styles.titleRow}>
            <Text style={styles.titleElite}>Elite</Text>
            <Text style={styles.titleBoards}>Boards</Text>
          </View>
          
          <Text style={styles.tagline}>
            Premium Academic Rankings
          </Text>

          {/* Animated line */}
          <View style={styles.lineContainer}>
            <Animated.View
              style={[
                styles.animatedLine,
                {
                  width: lineWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          {/* Status message */}
          <View style={styles.statusContainer}>
            <View style={styles.statusIndicator}>
              <Animated.View style={[styles.statusDot, { opacity: glowAnim }]} />
            </View>
            <Animated.Text style={[styles.statusText, { opacity: msgOpacity }]}>
              {STATUS_MESSAGES[msgIndex]}
            </Animated.Text>
            <LoadingDots />
          </View>
        </Animated.View>
      </Animated.View>

      {/* Bottom branding */}
      <Animated.View
        style={[
          styles.footer,
          { opacity: contentOpacity },
        ]}
      >
        <View style={styles.footerBadge}>
          <Text style={styles.footerText}>REAL-TIME SYSTEMS</Text>
        </View>
        <Text style={styles.versionText}>v2.0.4</Text>
      </Animated.View>
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
  bgGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(79, 70, 229, 0.03)',
  },
  particle: {
    position: 'absolute',
    backgroundColor: '#818cf8',
    borderRadius: 10,
  },
  ring: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: (width * 0.6) / 2,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  ring1: {
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  ring2: {
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  content: {
    alignItems: 'center',
    zIndex: 10,
  },
  logoContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  logoGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
  },
  shieldBadge: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },
  shieldEmoji: {
    fontSize: 60,
  },
  textContainer: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  titleElite: {
    color: '#c7d2fe',
    fontSize: 44,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -1,
  },
  titleBoards: {
    color: '#6366f1',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1,
    marginLeft: 4,
  },
  tagline: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 24,
  },
  lineContainer: {
    width: 200,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  animatedLine: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    overflow: 'hidden',
  },
  statusDot: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4ade80',
  },
  statusText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  loadingDots: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    gap: 8,
  },
  footerBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.15)',
  },
  footerText: {
    color: '#22c55e',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  versionText: {
    color: '#1e293b',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
