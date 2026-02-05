import React, { useEffect, useRef } from 'react';
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { View, Animated } from 'react-native';

export default function Logo({ size = 100, animated = false }) {
  const scanAnimation = useRef(new Animated.Value(0)).current;
  const blue = "#0038A8";
  const red = "#CE1126";
  const white = "#FFFFFF";

  useEffect(() => {
    if (animated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnimation, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [animated]);

  const translateY = scanAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 50],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={red} stopOpacity="0.8" />
            <Stop offset="1" stopColor={red} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Background Circle */}
        <Circle cx="50" cy="50" r="48" fill={blue} />

        {/* Paper Document */}
        <Rect x="30" y="25" width="40" height="50" rx="4" fill={white} />
        
        {/* Text Lines on Paper */}
        <Rect x="36" y="32" width="28" height="3" rx="1.5" fill="#E5E7EB" />
        <Rect x="36" y="40" width="28" height="3" rx="1.5" fill="#E5E7EB" />
        <Rect x="36" y="48" width="28" height="3" rx="1.5" fill="#E5E7EB" />
        <Rect x="36" y="56" width="20" height="3" rx="1.5" fill="#E5E7EB" />

        {/* Checkmark */}
        <Path
          d="M45 65 L55 65 L75 35"
          fill="none"
          stroke={red}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Scan Line Effect */}
        <Rect x="25" y="45" width="50" height="2" fill={red} opacity="0.8" />
        
      </Svg>
    </View>
  );
}