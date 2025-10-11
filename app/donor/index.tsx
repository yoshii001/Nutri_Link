import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ClipboardCheck, Package, DollarSign, Heart } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getPendingReadyDonationsByDonorId } from '@/services/firebase/readyDonationService';
import { theme } from '@/constants/theme';

export default function DonorIndex() {
  const router = useRouter();
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const loadPendingCount = async () => {
      try {
        const pending = await getPendingReadyDonationsByDonorId(user.uid);
        setPendingCount(Object.keys(pending).length);
      } catch (error) {
        console.error('Error loading pending count:', error);
      }
    };

    loadPendingCount();
    const interval = setInterval(loadPendingCount, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const menuItems = [
    {
      icon: ClipboardCheck,
      title: 'Approval Requests',
      subtitle: 'Review and approve donation requests',
      route: '/donor/approval-requests',
      badge: pendingCount > 0 ? pendingCount : undefined,
      colors: ['#10B981', '#059669'],
    },
    {
      icon: Package,
      title: 'Food Donations',
      subtitle: 'Donate food items to schools',
      route: '/donor/food',
      colors: ['#3B82F6', '#2563EB'],
    },
    {
      icon: DollarSign,
      title: 'Money Donations',
      subtitle: 'Make monetary contributions',
      route: '/donor/money',
      colors: ['#8B5CF6', '#7C3AED'],
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Heart size={56} color={theme.colors.surface} strokeWidth={2} />
        <Text style={styles.headerTitle}>Donor Portal</Text>
        <Text style={styles.headerSubtitle}>Make a difference in students' lives</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.8}
                style={styles.menuCard}
              >
                <LinearGradient
                  colors={item.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.menuCardGradient}
                >
                  <View style={styles.iconContainer}>
                    <Icon size={36} color={theme.colors.surface} strokeWidth={2} />
                  </View>
                  <View style={styles.menuCardContent}>
                    <View style={styles.menuCardHeader}>
                      <Text style={styles.menuCardTitle}>{item.title}</Text>
                      {item.badge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{item.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.menuCardSubtitle}>{item.subtitle}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: theme.colors.surface,
    marginTop: theme.spacing.md,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.surface,
    opacity: 0.9,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  menuGrid: {
    gap: theme.spacing.md,
  },
  menuCard: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  menuCardGradient: {
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 110,
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  menuCardContent: {
    flex: 1,
  },
  menuCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  menuCardTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: theme.colors.surface,
  },
  badge: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    minWidth: 26,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: theme.colors.primary,
  },
  menuCardSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.surface,
    opacity: 0.9,
    lineHeight: 20,
  },
});
