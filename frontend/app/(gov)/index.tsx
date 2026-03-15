import { View, Text, StyleSheet, Button } from 'react-native';
import { supabase } from '../../src/services/supabase';

export default function GovtOfficerDashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Government Officer Dashboard</Text>
      <Button title="Sign Out" onPress={() => supabase.auth.signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
});
