import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, ArrowLeft } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { loginWithAccessCode } from '@/services/parent/parentAuthService';

export default function ParentLoginScreen() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!accessCode.trim()) {
      if (Platform.OS === 'web') {
        alert('Please enter your access code');
      } else {
        Alert.alert('Error', 'Please enter your access code');
      }
      return;
    }

    setLoading(true);
    try {
      const session = await loginWithAccessCode(accessCode);

      if (!session) {
        if (Platform.OS === 'web') {
          alert('Login failed. Please try again.');
        } else {
          Alert.alert('Error', 'Login failed. Please try again.');
        }
        setLoading(false);
        return;
      }

      router.replace('/parent/portal');
    } catch (error: any) {
      console.error('Error during parent login:', error);
      const errorMessage = error?.message || 'Login failed. Please try again.';

      if (Platform.OS === 'web') {
        alert(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={theme.colors.primary} strokeWidth={2} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={[theme.colors.primary, theme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Heart size={64} color={theme.colors.surface} strokeWidth={2} />
        <Text style={styles.headerTitle}>Parent Portal</Text>
        <Text style={styles.headerSubtitle}>Enter your access code to view your child's meal info</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Access Code</Text>
          <Text style={styles.hint}>Enter the 8-character access code provided by your child's teacher</Text>

          <TextInput
            style={styles.input}
            value={accessCode}
            onChangeText={(text) => setAccessCode(text)}
            placeholder="XXXXXXX$"
            placeholderTextColor={theme.colors.text.light}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
          />

          <Text style={styles.example}>7 capital letters + 1 symbol ($, @, #, or *)</Text>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={loading ? ['#9CA3AF', '#9CA3AF'] : [theme.colors.primary, theme.colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginButtonGradient}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Logging in...' : 'Access Portal'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>What can you do in the Parent Portal?</Text>
            <Text style={styles.infoItem}>• View your child's information</Text>
            <Text style={styles.infoItem}>• See today's meal and donor details</Text>
            <Text style={styles.infoItem}>• Update allergy information</Text>
            <Text style={styles.infoItem}>• Provide meal feedback</Text>
            <Text style={styles.infoItem}>• Rate donors</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.primary,
  },
  header: {
    paddingTop: 60,
    paddingBottom: theme.spacing.xl,
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
    padding: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    ...theme.shadows.md,
  },
  label: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  hint: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
  },
  input: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: theme.spacing.sm,
  },
  example: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.light,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  loginButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
    marginBottom: theme.spacing.xl,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonGradient: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: theme.colors.surface,
  },
  infoBox: {
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  infoItem: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
});
