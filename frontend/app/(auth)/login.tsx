import { View, Text, Button, StyleSheet } from 'react-native';
import { supabase } from '../../src/services/supabase';

export default function LoginScreen() {
  const handleMockLogin = async (role: string) => {
    // In actual implementation, we would use email/pass
    // Here we might just use a mock sign in or prompt user
    console.log(`Mock sign in for ${role}`);
    // supabase.auth.signInWithPassword(...)
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Senior Care Monitoring</Text>
      <Text style={styles.subtitle}>Login</Text>
      <View style={styles.buttonContainer}>
        <Button title="Login as Admin" onPress={() => handleMockLogin('admin')} />
        <Button title="Login as Caretaker" onPress={() => handleMockLogin('caretaker')} />
        <Button title="Login as Govt Officer" onPress={() => handleMockLogin('gov')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 18, marginBottom: 30 },
  buttonContainer: { gap: 15, width: '100%' },
});
