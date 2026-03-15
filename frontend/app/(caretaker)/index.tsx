import { View, Text, StyleSheet, Button, ScrollView, TouchableOpacity } from 'react-native';
import { supabase } from '../../src/services/supabase';

export default function CaretakerDashboard() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Caretaker Dashboard</Text>
        <Button title="Sign Out" onPress={() => supabase.auth.signOut()} />
      </View>

      <View style={styles.cardContainer}>
        {/* Card 1 */}
        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>Resident Health Log</Text>
          <Text style={styles.cardSubtitle}>Update daily vitals</Text>
        </TouchableOpacity>

        {/* Card 2 */}
        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>Emergency Reports</Text>
          <Text style={styles.cardSubtitle}>View urgent tasks</Text>
        </TouchableOpacity>

        {/* Card 3 */}
        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>Inventory Status</Text>
          <Text style={styles.cardSubtitle}>Check medical supplies</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E0E0E0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  cardContainer: { padding: 20, gap: 15 },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Android shadow
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 5 },
  cardSubtitle: { fontSize: 14, color: '#666' },
});
