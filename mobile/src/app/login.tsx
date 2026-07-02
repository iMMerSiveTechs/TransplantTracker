import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/data/colors';
import { signIn, signUp } from '@/lib/auth';
import S from '@/utils/storage';
import Card from '@/components/Card';

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const result = await signUp.email({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        });
        if (result.error) {
          setError(result.error.message || 'Signup failed');
          setLoading(false);
          return;
        }
      } else {
        const result = await signIn.email({
          email: email.trim().toLowerCase(),
          password,
        });
        if (result.error) {
          setError(result.error.message || 'Login failed');
          setLoading(false);
          return;
        }
      }

      await S.set('auth_logged_in', true);
      const onboarded = await S.get('onboarding_complete');
      if (onboarded) {
        router.replace('/(tabs)');
      } else {
        router.replace('/setup');
      }
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await S.set('auth_skipped', true);
    const onboarded = await S.get('onboarding_complete');
    if (onboarded) {
      router.replace('/(tabs)');
    } else {
      router.replace('/setup');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.emoji}>🫀</Text>
        <Text style={styles.title}>TransplantTracker</Text>
        <Text style={styles.subtitle}>
          {mode === 'login'
            ? 'Sign in to sync your data across devices'
            : 'Create an account to get started'}
        </Text>
      </View>

      <Card>
        {mode === 'signup' ? (
          <>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.slate300}
              style={styles.input}
              autoCapitalize="words"
              editable={!loading}
            />
            <View style={{ height: 16 }} />
          </>
        ) : null}

        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.slate300}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
          editable={!loading}
        />

        <View style={{ height: 16 }} />

        <Text style={styles.inputLabel}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          placeholderTextColor={colors.slate300}
          style={styles.input}
          secureTextEntry
          editable={!loading}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </Card>

      <Pressable
        style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
        onPress={handleAuth}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.primaryBtnText}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Text>
        )}
      </Pressable>

      <Pressable
        style={styles.switchBtn}
        onPress={() => {
          setMode(mode === 'login' ? 'signup' : 'login');
          setError('');
        }}
        disabled={loading}
      >
        <Text style={styles.switchText}>
          {mode === 'login'
            ? "Don't have an account? Sign Up"
            : 'Already have an account? Sign In'}
        </Text>
      </Pressable>

      <Pressable style={styles.skipBtn} onPress={handleSkip} disabled={loading}>
        <Text style={styles.skipText}>Continue without an account</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 20, paddingTop: 80 },
  header: { alignItems: 'center', marginBottom: 32 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.slate800,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.slate500,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.slate600,
    marginBottom: 8,
  },
  input: {
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    fontSize: 16,
    fontWeight: '500',
    color: colors.slate800,
  },
  errorBox: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.rose50,
    borderWidth: 1,
    borderColor: colors.rose200,
  },
  errorText: {
    fontSize: 13,
    color: colors.rose600,
    fontWeight: '500',
  },
  primaryBtn: {
    backgroundColor: colors.indigo500,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: colors.indigo500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  switchBtn: { alignItems: 'center', marginTop: 20 },
  switchText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.indigo500,
  },
  skipBtn: { alignItems: 'center', marginTop: 16, paddingBottom: 40 },
  skipText: { fontSize: 13, color: colors.slate400 },
});
