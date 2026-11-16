import { StyleSheet, Text, View } from 'react-native';

interface CircularNutritionProps {
  consumed: number;
  target: number;
}

export default function CircularNutrition({ consumed, target }: CircularNutritionProps) {
  const percent = target > 0 ? Math.min(Math.round((consumed / target) * 100), 100) : 0;
  const formattedConsumed = consumed.toLocaleString('vi-VN');

  return (
    <View style={s.container}>
      {/* Background Track Ring */}
      <View style={s.outerRing}>
        {/* Progress Arc Overlay */}
        <View style={s.progressArc} />
        {/* Inner Content */}
        <View style={s.innerContent}>
          <Text style={s.numberText}>{formattedConsumed}</Text>
          <Text style={s.unitText}>kcal đã nạp</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 8,
    borderColor: '#245E3F',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressArc: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 8,
    borderColor: 'transparent',
    borderTopColor: '#86EFAC',
    borderRightColor: '#86EFAC',
    borderBottomColor: '#86EFAC',
    transform: [{ rotate: '-45deg' }],
  },
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  unitText: {
    fontSize: 11,
    color: '#D1E7DD',
    marginTop: 2,
    fontWeight: '500',
  },
});
