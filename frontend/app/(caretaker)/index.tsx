import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

type Resident = {
  id: string;
  name: string;
  age: number;
  room_number: string;
  status: 'green' | 'yellow' | 'red';
  last_report_time: string | null;
};

export default function CaretakerDashboard() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    fetchResidents();

    // Listen for foreground notifications and refresh data
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground, refreshing residents...');
      fetchResidents();
    });

    return () => {
      notificationListener.remove();
    };
  }, []);

  const fetchResidents = async () => {
    try {
      // 1. Get the caretaker's vrudhashram_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('vrudhashram_id')
        .eq('id', user?.id)
        .single();
        
      if (userError || !userData?.vrudhashram_id) throw userError;

      // 2. Get residents in that vrudhashram
      const { data: resData, error: resError } = await supabase
        .from('residents')
        .select('id, name, age, room_number')
        .eq('vrudhashram_id', userData.vrudhashram_id);

      if (resError) throw resError;

      // 3. For each resident, get their latest daily report to determine status and last_report_time
      // Note: In a production app, this would ideally be done via a Postgres function or view for performance
      const residentsWithStatus = await Promise.all((resData || []).map(async (resident) => {
        const { data: reportData } = await supabase
          .from('daily_reports')
          .select('created_at, issues')
          .eq('resident_id', resident.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        let status: 'green' | 'yellow' | 'red' = 'green';
        if (reportData?.issues && reportData.issues.length > 0) {
            status = 'yellow'; // Or red depending on logic, let's use yellow for issues
        }

        // If no report in last 24 hours, could mark as yellow/red too
        
        return {
          ...resident,
          status,
          last_report_time: reportData ? new Date(reportData.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'No report yet'
        } as Resident;
      }));

      setResidents(residentsWithStatus);
    } catch (error) {
      console.error('Error fetching residents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green': return '#10B981';
      case 'yellow': return '#F59E0B';
      case 'red': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Residents</Text>
          <Text style={styles.subtitle}>Your assigned ward</Text>
        </View>
        <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#4F46E5' }]}
          onPress={() => router.push('/(caretaker)/report')}
        >
          <Ionicons name="document-text-outline" size={24} color="white" />
          <Text style={styles.actionBtnText}>Log Daily Report</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
          onPress={() => router.push('/(caretaker)/alert')}
        >
          <Ionicons name="warning-outline" size={24} color="white" />
          <Text style={styles.actionBtnText}>Emergency Alert</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={residents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No residents found.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.details}>Age: {item.age} • Room: {item.room_number}</Text>
              </View>
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
            </View>
            <View style={styles.cardFooter}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={styles.timeText}>Last report: {item.last_report_time}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 60, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  logoutBtn: { padding: 8, backgroundColor: '#FEE2E2', borderRadius: 8 },
  actionsContainer: { flexDirection: 'row', padding: 16, gap: 12 },
  actionButton: { flex: 1, padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  listContainer: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  details: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  statusIndicator: { width: 12, height: 12, borderRadius: 6 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12, gap: 6 },
  timeText: { fontSize: 14, color: '#6B7280' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#6B7280', fontSize: 16 },
});
