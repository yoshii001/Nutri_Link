import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Home, Users, UtensilsCrossed, ClipboardCheck, Package, Warehouse } from 'lucide-react-native';
import { theme } from '@/constants/theme';

export default function TeacherBottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/teacher/dashboard',
    },
    {
      id: 'claim',
      label: 'Claim',
      icon: Package,
      path: '/teacher/claim-meal',
    },
    {
      id: 'stock',
      label: 'Stock',
      icon: Warehouse,
      path: '/teacher/meal-stock',
    },
    {
      id: 'serve',
      label: 'Serve',
      icon: UtensilsCrossed,
      path: '/teacher/serve-meals',
    },
    {
      id: 'students',
      label: 'Students',
      icon: Users,
      path: '/teacher/students',
    },
  ];

  return (
    <View style={styles.container}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.path;

        return (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => router.push(item.path as any)}
            activeOpacity={0.7}
          >
            <Icon
              size={24}
              color={isActive ? theme.colors.primary : theme.colors.text.light}
              strokeWidth={isActive ? 2.5 : 2}
            />
            <Text
              style={[
                styles.navLabel,
                isActive && styles.navLabelActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...theme.shadows.lg,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  navLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.light,
    marginTop: 4,
  },
  navLabelActive: {
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.primary,
  },
});
