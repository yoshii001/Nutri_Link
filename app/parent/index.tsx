import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { Heart } from 'lucide-react-native';

export default function ParentIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/parent-login');
  }, []);

  return (
    <View style={styles.container}>
      <Heart color={theme.colors.primary} size={80} />
      <Text style={styles.title}>Redirecting to Parent Portal...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginTop: 20,
    marginBottom: 8,
    color: theme.colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 30,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
});
