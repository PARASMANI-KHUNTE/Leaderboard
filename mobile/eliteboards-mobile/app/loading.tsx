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
  'VERIFYING_CREDENTIALS...',
  'CALIBRATING_ELITE_METRICS...',
  'ALMOST_READY...',
];

function Particle({ particle }: { particle: Particle }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(particle.delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.5,
            duration: particle.duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -30,
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
            toValue: 30,
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

function PulsingOrb({ style, color, size, delay }: { style?: any; color: string; size: number; delay: number }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 2,
            duration: 2000,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.pulsingOrb,
        {
          backgroundColor: color,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
          transform: [{ scale }],
        },
        style,
      ]}
    />
  );
}

export default function Loading() {
  const [splashHidden, setSplashHidden] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(50)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const shieldPulse = useRef(new Animated.Value(1)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  
  const [msgIndex, setMsgIndex] = useState(0);
  const msgOpacity = useRef(new Animated.Value(1)).current;

  const particles = useMemo<Particle[]>(() => 
    Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: Math.random() * width,
      top: height * 0.15 + Math.random() * (height * 0.55),
      size: Math.random() * 5 + 2,
      duration: Math.random() * 2500 + 2500,
      delay: Math.random() * 4000,
    })), 
  []);

  useEffect(() => {
    // Start all animations
    const animationSequence = Animated.sequence([
      // Phase 0: Initial fade in (0-400ms)
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      
      // Phase 1: Logo entrance (400-1600ms)
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringScale, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      
      // Phase 2: Content reveal (1600-2600ms)
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(contentTranslateY, {
          toValue: 0,
          friction: 10,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),
      
      // Phase 3: Progress line (2600-3600ms)
      Animated.timing(lineWidth, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      
      // Phase 4: Footer (3600-4200ms)
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);

    animationSequence.start();

    // Show content after initial animation
    const splashTimer = setTimeout(() => {
      setSplashHidden(true);
    }, 600);

    // Glow pulse loop (starts after logo appears)
    const glowTimer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 1000);

    // Shield pulse loop
    const shieldTimer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shieldPulse, {
            toValue: 1.08,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(shieldPulse, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 800);

    // Message rotation (every 2.5 seconds)
    const msgInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(msgOpacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMsgIndex(prev => (prev + 1) % STATUS_MESSAGES.length);
        Animated.timing(msgOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start();
      });
    }, 2500);

    return () => {
      clearTimeout(splashTimer);
      clearTimeout(glowTimer);
      clearTimeout(shieldTimer);
      clearInterval(msgInterval);
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <View style={styles.bgGradient} />
      
      {/* Pulsing orbs */}
      <PulsingOrb style={styles.orb1} color="#4f46e5" size={120} delay={0} />
      <PulsingOrb style={styles.orb2} color="#6366f1" size={80} delay={500} />
      <PulsingOrb style={styles.orb3} color="#818cf8" size={60} delay={1000} />

      {/* Floating particles */}
      {particles.map(p => (
        <Particle key={p.id} particle={p} />
      ))}

      {/* Animated rings */}
      <Animated.View
        style={[
          styles.ring,
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
            opacity: Animated.multiply(ringOpacity, 0.4),
            transform: [{ scale: Animated.multiply(ringScale, 1.2) }],
          },
        ]}
      />

      {/* Main content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Logo container */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [
                { scale: Animated.multiply(logoScale, shieldPulse) },
              ],
            },
          ]}
        >
          {/* Glow effect */}
          <Animated.View
            style={[
              styles.logoGlow,
              {
                opacity: Animated.multiply(glowAnim, 0.5),
                transform: [{ scale: Animated.add(Animated.multiply(glowAnim, 0.3), 1) }],
              },
            ]}
          />
          
          {/* Shield badge */}
          <View style={styles.shieldBadge}>
            <Text style={styles.shieldEmoji}>🏆</Text>
          </View>
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
              <Animated.View 
                style={[
                  styles.statusDot,
                  {
                    opacity: glowAnim,
                  },
                ]} 
              />
            </View>
            <Animated.Text style={[styles.statusText, { opacity: msgOpacity }]}>
              {STATUS_MESSAGES[msgIndex]}
            </Animated.Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* Bottom branding */}
      <Animated.View
        style={[
          styles.footer,
          { opacity: footerOpacity },
        ]}
      >
        <View style={styles.footerBadge}>
          <View style={styles.footerDot} />
          <Text style={styles.footerText}>REAL-TIME SYSTEMS ACTIVE</Text>
        </View>
        <Text style={styles.versionText}>v2.0.4-PREMIUM</Text>
      </Animated.View>
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
  bgGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(79, 70, 229, 0.02)',
  },
  orb1: {
    position: 'absolute',
    top: height * 0.1,
    left: -40,
  },
  orb2: {
    position: 'absolute',
    top: height * 0.4,
    right: -30,
  },
  orb3: {
    position: 'absolute',
    bottom: height * 0.3,
    left: -20,
  },
  pulsingOrb: {
    position: 'absolute',
  },
  particle: {
    position: 'absolute',
    backgroundColor: '#818cf8',
    borderRadius: 10,
  },
  ring: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  ring2: {
    borderColor: 'rgba(99, 102, 241, 0.12)',
  },
  content: {
    alignItems: 'center',
    zIndex: 10,
  },
  logoContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  logoGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 60,
  },
  shieldBadge: {
    width: 130,
    height: 130,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldEmoji: {
    fontSize: 64,
  },
  textContainer: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  titleElite: {
    color: '#c7d2fe',
    fontSize: 48,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -1.5,
  },
  titleBoards: {
    color: '#6366f1',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1.5,
    marginLeft: 6,
  },
  tagline: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 28,
  },
  lineContainer: {
    width: 220,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 28,
  },
  animatedLine: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  statusText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 70,
    alignItems: 'center',
    gap: 12,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  footerText: {
    color: '#22c55e',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  versionText: {
    color: '#1e293b',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
