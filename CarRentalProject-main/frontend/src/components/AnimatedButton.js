import React from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { COLORS, SHADOWS } from '../theme/colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const AnimatedButton = ({ title, onPress, style, textStyle, variant = 'primary' }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.95, {
        damping: 15,
        stiffness: 300,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
        damping: 10,
        stiffness: 150,
    });
  };

  const getBackgroundColor = () => {
    switch(variant) {
      case 'primary': return COLORS.primary;
      case 'accent': return COLORS.accent;
      case 'outline': return 'transparent';
      default: return COLORS.primary;
    }
  };

  const getTextColor = () => {
    switch(variant) {
      case 'primary': 
      case 'accent': return COLORS.white;
      case 'outline': return COLORS.primary;
      default: return COLORS.white;
    }
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        variant !== 'outline' && SHADOWS.heavy,
        variant === 'outline' && styles.outlineButton,
        style,
        animatedStyle,
      ]}
    >
      <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
        {title}
      </Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  outlineButton: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default AnimatedButton;
