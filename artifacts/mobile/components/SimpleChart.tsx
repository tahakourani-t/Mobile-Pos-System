import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { WeeklySalesPoint } from '@/types';

interface SimpleChartProps {
  data: WeeklySalesPoint[];
  highlightIndex?: number;
  height?: number;
}

export default function SimpleChart({ data, highlightIndex, height = 90 }: SimpleChartProps) {
  const colors = useColors();
  const max = Math.max(...data.map(d => d.sales), 1);

  return (
    <View style={[styles.container, { height: height + 28 }]}>
      <View style={[styles.barsRow, { height }]}>
        {data.map((d, i) => {
          const barHeight = Math.max((d.sales / max) * (height - 10), 4);
          const isHighlight = highlightIndex !== undefined ? i === highlightIndex : i === data.length - 1;
          return (
            <View key={i} style={styles.barCol}>
              <View style={[styles.barBg, { height, borderRadius: 6, backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      borderRadius: 6,
                      backgroundColor: isHighlight ? colors.primary : colors.primary + '50',
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.labelsRow}>
        {data.map((d, i) => (
          <Text key={i} style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{d.day}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  barCol: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  barBg: {
    width: '100%',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
  },
  labelsRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 5,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
  },
});
