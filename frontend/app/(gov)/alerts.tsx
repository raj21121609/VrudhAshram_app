import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

type AlertData = {
  id: string;
  type: string;
  description: string;
  status: string;
  created_at: string;
  resident_name?: string;
  vrudhashram_name?: string;
};

export default function GovtOfficerAlertsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [filter, setFilter] = useState<'all' | 'emergency' | 'missing_report' | 'inspection'>('all');

  const fetchAlerts = async () => {
    try {
      // 1. Fetch alerts
      const { data: aData, error: aError } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (aError) throw aError;

      // 2. We need vrudhashram names and resident names. 
      // For performance in a real app, use a SQL view joining these tables. 
      // Here we will do sequential fetches since data is expected to be small for demo.
      const { data: vData } = await supabase.from('vrudhashrams').select('id, name');
      const { data: rData } = await supabase.from('residents').select('id, name');

      const mappedAlerts = (aData || []).map(alert => {
        const vName = vData?.find(v => v.id === alert.vrudhashram_id)?.name || 'Unknown Home';
        const rName = rData?.find(r => r.id === alert.resident_id)?.name;

        return {
          id: alert.id,
          type: alert.type,
          description: alert.description,
          status: alert.status,
          created_at: new Date(alert.created_at).toLocaleString(),
          resident_name: rName,
          vrudhashram_name: vName,
        };
      });

      setAlerts(mappedAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Listen for foreground notifications and refresh data
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground, refreshing alerts...');
      fetchAlerts();
    });

    return () => {
      notificationListener.remove();
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'emergency': return { name: 'warning', color: '#EF4444' };
      case 'missing_report': return { name: 'search', color: '#F59E0B' };
      case 'inspection': return { name: 'clipboard', color: '#3B82F6' };
      default: return { name: 'alert-circle', color: '#6B7280' };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'emergency': return 'Emergency';
      case 'missing_report': return 'Missing Person';
      case 'inspection': return 'Inspection Req.';
      default: return 'Alert';
    }
  };

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(a => a.type === filter);

  const FilterPill = ({ label, value }: { label: string, value: typeof filter }) => (
    <TouchableOpacity 
      style={[styles.filterPill, filter === value && styles.filterPillActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Alerts</Text>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          <FilterPill label="All" value="all" />
          <FilterPill label="Emergencies" value="emergency" />
          <FilterPill label="Missing" value="missing_report" />
          <FilterPill label="Inspections" value="inspection" />
        </ScrollView>
      </View>

      <FlatList
        data={filteredAlerts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={60} color="#10B981" />
            <Text style={styles.emptyText}>No alerts found for this filter.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const iconConfig = getAlertIcon(item.type);
          
          return (
            <View style={[styles.alertCard, item.status === 'pending' && styles.pendingCard]}>
              <View style={styles.cardHeader}>
                <View style={styles.typeBadge}>
                  <Ionicons name={iconConfig.name as any} size={16} color={iconConfig.color} />
                  <Text style={[styles.typeText, { color: iconConfig.color }]}>
                    {getTypeLabel(item.type).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.dateText}>{item.created_at}</Text>
              </View>
              
              <Text style={styles.description}>{item.description}</Text>
              
              <View style={styles.metaContainer}>
                <View style={styles.metaRow}>
                  <Ionicons name="business-outline" size={14} color="#6B7280" />
                  <Text style={styles.metaText}>{item.vrudhashram_name}</Text>
                </View>
                {item.resident_name && (
                  <View style={styles.metaRow}>
                    <Ionicons name="person-outline" size={14} color="#6B7280" />
                    <Text style={styles.metaText}>Resident: {item.resident_name}</Text>
                  </View>
                )}
              </View>

              <View style={styles.footer}>
                <View style={[styles.statusBadge, item.status === 'pending' ? styles.statusPending : styles.statusResolved]}>
                  <Text style={[styles.statusText, item.status === 'pending' ? styles.statusTextPending : styles.statusTextResolved]}>
                    STATUS: {item.status.toUpperCase()}
                  </Text>
                </View>

                {item.status === 'pending' && (
                  <TouchableOpacity 
                    style={styles.resolveBtn}
                    onPress={() => {
                        // In reality, this would send an UPDATE to supabase
                        alert("Marked as resolved (Mock)");
                    }}
                  >
                    <Text style={styles.resolveBtnText}>Mark Resolved</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  filterContainer: { backgroundColor: '#FFFFFF', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: 'transparent' },
  filterPillActive: { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
  filterText: { color: '#6B7280', fontWeight: '500' },
  filterTextActive: { color: '#EF4444', fontWeight: 'bold' },
  listContainer: { padding: 16, paddingBottom: 60 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#6B7280', fontSize: 16, marginTop: 12 },
  alertCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: '#F3F4F6' },
  pendingCard: { borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F9FAFB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeText: { fontSize: 12, fontWeight: 'bold' },
  dateText: { fontSize: 12, color: '#9CA3AF' },
  description: { fontSize: 16, color: '#111827', marginBottom: 16, lineHeight: 22 },
  metaContainer: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, gap: 6, marginBottom: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 14, color: '#4B5563' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusPending: { backgroundColor: '#FEF2F2' },
  statusResolved: { backgroundColor: '#ECFDF5' },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  statusTextPending: { color: '#EF4444' },
  statusTextResolved: { color: '#10B981' },
  resolveBtn: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  resolveBtnText: { color: '#4B5563', fontSize: 12, fontWeight: '600' }
});
