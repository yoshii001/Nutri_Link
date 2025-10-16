import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

interface Props {
  totalDonated: number; // currency units (Rs.) including monetary + an approximate value for in-kind
}

const TIERS: { id: BadgeTier; label: string; threshold: number; color: string }[] = [
  { id: 'bronze', label: 'Bronze Donor', threshold: 1, color: '#8B5A2B' },
  { id: 'silver', label: 'Silver Donor', threshold: 1000, color: '#C0C0C0' },
  { id: 'gold', label: 'Gold Donor', threshold: 5000, color: '#D4AF37' },
  { id: 'platinum', label: 'Platinum Donor', threshold: 20000, color: '#7DE3FF' },
];

function getTier(total: number) {
  // Find highest tier where total >= threshold
  let current = TIERS[0];
  for (let i = 0; i < TIERS.length; i++) {
    if (total >= TIERS[i].threshold) current = TIERS[i];
  }
  const nextIndex = TIERS.findIndex((t) => t.id === current.id) + 1;
  const next = TIERS[nextIndex] || null;
  const progress = next ? Math.min(100, Math.round((total / next.threshold) * 100)) : 100;
  return { current, next, progress } as {
    current: typeof TIERS[number];
    next: typeof TIERS[number] | null;
    progress: number;
  };
}

export default function DonorBadge({ totalDonated }: Props) {
  const { current, next, progress } = getTier(totalDonated);

  return (
    <View style={styles.root}>
      <View style={[styles.badge, { backgroundColor: current.color + '22', borderColor: current.color }]}> 
        <Text style={[styles.badgeLabel, { color: current.color }]}>{current.label}</Text>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: current.color }]} />
        </View>
        <Text style={styles.progressText}>{progress}% to {next ? next.label : 'Max'}</Text>
      </View>

      {next && progress < 100 && (
        <Text style={styles.motivation}>Keep giving to reach {next.label}!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    padding: 12,
    alignItems: 'flex-start',
    width: '100%',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  badgeLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  progressRow: {
    width: '100%',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 6,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 6,
  },
  progressText: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  motivation: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.primary,
  },
});
