import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import SettingsMenu from './SettingsMenu';
import { theme } from '@/constants/theme';

interface PrincipalHeaderProps {
  title: string;
  showBack?: boolean;
  subtitle?: string;
}

export default function PrincipalHeader({ title, showBack = false, subtitle }: PrincipalHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      <SettingsMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingTop: 50,
    backgroundColor: theme.colors.primary,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: theme.spacing.md,
    padding: 4,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
});
