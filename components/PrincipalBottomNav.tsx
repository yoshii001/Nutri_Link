import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Home, Users, Calendar, DollarSign, FileText } from 'lucide-react-native';
import { theme } from '@/constants/theme';

export default function PrincipalBottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/principal/dashboard',
    },
    {
      id: 'classes',
      label: 'Classes',
      icon: Users,
      path: '/principal/manage-classes',
    },
    {
      id: 'teachers',
      label: 'Teachers',
      icon: Users,
      path: '/principal/manage-teachers',
    },
    {
      id: 'meals',
      label: 'Meals',
      icon: Calendar,
      path: '/principal/meal-plans',
    },
    {
      id: 'donors',
      label: 'Donors',
      icon: DollarSign,
      path: '/principal/donor-list',
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
