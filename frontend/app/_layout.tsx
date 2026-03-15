import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

const RootLayoutNav = () => {
  const { session, role, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (!session && !inAuthGroup) {
      // Redirect to login if user is not authenticated
      router.replace('/(auth)/login' as any);
    } else if (session) {
      // In a real scenario, you probably want to use router.replace('/') for the role home.
      // But we will map roles directly to their group folders:
      if (role === 'admin' && segments[0] !== '(admin)') {
        router.replace('/(admin)' as any);
      } else if (role === 'caretaker' && segments[0] !== '(caretaker)') {
        router.replace('/(caretaker)' as any);
      } else if (role === 'gov' && segments[0] !== '(gov)') {
        router.replace('/(gov)' as any);
      } else if (!role && !inAuthGroup) {
         // Role might still be loading or missing, maybe a fallback screen
         console.warn('No role assigned to this user yet');
      }
    }
  }, [session, role, loading, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
