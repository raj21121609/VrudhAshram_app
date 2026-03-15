import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../src/services/supabase';
import { Ionicons } from '@expo/vector-icons';

type VrudhashramDetails = {
  id: string;
  name: string;
  location: string;
  district: string;
  total_residents: number;
};

type ReportStat = {
  id: string;
  date: string;
  resident_name: string;
  issues: string;
  mood: string;
};

export default function VrudhashramActionScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [homeData, setHomeData] = useState<VrudhashramDetails | null>(null);
  const [recentReports, setRecentReports] = useState<ReportStat[]>([]);

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
      // Fetch Home Details
      const { data: hData, error: hError } = await supabase
        .from('vrudhashrams')
        .select('*')
        .eq('id', id)
        .single();
        
      if (hError) throw hError;
      setHomeData(hData);

      // Fetch Recent Reports for this home based on residents
      // Note: Ideal schema might have vrudhashram_id directly on daily_reports, 
      // but here we filter through the connected residents using Supabase relationships or separate query.
      const { data: rData, error: rError } = await supabase
        .from('residents')
        .select('id, name')
        .eq('vrudhashram_id', id);
        
      if (rError) throw rError;

      const residentIds = rData.map(r => r.id);
      
      if (residentIds.length > 0) {
        const { data: repData, error: repError } = await supabase
          .from('daily_reports')
          .select('id, created_at, issues, mood, resident_id')
          .in('resident_id', residentIds)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (repError) throw repError;
        
        const mappedReports = repData.map(rep => {
           const rName = rData.find(r => r.id === rep.resident_id)?.name || 'Unknown';
           return {
             id: rep.id,
             date: new Date(rep.created_at).toLocaleDateString(),
             resident_name: rName,
             issues: rep.issues,
             mood: rep.mood
           };
        });
        
        setRecentReports(mappedReports);
      }
    } catch (error) {
      console.error('Error fetching v-home details:', error);
      Alert.alert('Error', 'Failed to load home details');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (actionType: string) => {
    Alert.alert(
      `Confirm Action: ${actionType}`,
      `Are you sure you want to proceed with "${actionType}" for ${homeData?.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          onPress: () => {
             // Mock action implementation. In reality, inserts into an audits table or updates status.
             Alert.alert('Success', `Action "${actionType}" has been logged successfully.`);
          }
        }
      ]
    );
  };

  if (loading || !homeData) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const ActionButton = ({ title, icon, color, onPress }: any) => (
    <TouchableOpacity 
      style={[styles.actionBtn, { borderColor: color, backgroundColor: `${color}10` }]} 
      onPress={onPress}
    >
      <Ionicons name={icon} size={24} color={color} style={{ marginBottom: 8 }} />
      <Text style={[styles.actionBtnText, { color }]}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Home Details</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.homeName}>{homeData.name}</Text>
        <Text style={styles.homeLocation}>{homeData.location}, {homeData.district}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{homeData.total_residents} Registered Residents</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Officer Actions</Text>
      <View style={styles.actionsGrid}>
        <ActionButton 
          title="Verify Reports" 
          icon="checkmark-done-circle-outline" 
          color="#10B981" 
          onPress={() => handleAction('Verify Reports')} 
        />
        <ActionButton 
          title="Send Warning" 
          icon="warning-outline" 
          color="#F59E0B" 
          onPress={() => handleAction('Send Warning Notice')} 
        />
        <ActionButton 
          title="Schedule Inspect" 
          icon="calendar-outline" 
          color="#3B82F6" 
          onPress={() => handleAction('Schedule Inspection')} 
        />
        <ActionButton 
          title="Legal Action" 
          icon="gavel-outline" 
          color="#EF4444" 
          onPress={() => handleAction('Initiate Legal Action')} 
        />
      </View>

      <Text style={styles.sectionTitle}>Recent Daily Reports</Text>
      <View style={styles.reportsContainer}>
        {recentReports.length === 0 ? (
          <Text style={styles.emptyText}>No recent reports found.</Text>
        ) : (
          recentReports.map(report => (
             <View key={report.id} style={styles.reportCard}>
               <View style={styles.reportHeader}>
                 <Text style={styles.reportResident}>{report.resident_name}</Text>
                 <Text style={styles.reportDate}>{report.date}</Text>
               </View>
               <View style={styles.reportRow}>
                 <Text style={styles.reportLabel}>Mood:</Text>
                 <Text style={styles.reportValue}>{report.mood || 'N/A'}</Text>
               </View>
               <View style={styles.reportRow}>
                 <Text style={styles.reportLabel}>Issues:</Text>
                 <Text style={[styles.reportValue, report.issues ? { color: '#EF4444' } : null]}>
                   {report.issues || 'None reported'}
                 </Text>
               </View>
             </View>
          ))
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  infoCard: { backgroundColor: '#FFFFFF', padding: 20, margin: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  homeName: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  homeLocation: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  badge: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start', marginTop: 12 },
  badgeText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginHorizontal: 16, marginTop: 16, marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 12 },
  actionBtn: { width: '46%', padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  actionBtnText: { fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  reportsContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  reportCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 8 },
  reportResident: { fontWeight: 'bold', fontSize: 16, color: '#1F2937' },
  reportDate: { color: '#6B7280', fontSize: 14 },
  reportRow: { flexDirection: 'row', marginTop: 4 },
  reportLabel: { width: 60, color: '#6B7280', fontWeight: '500' },
  reportValue: { flex: 1, color: '#111827' },
  emptyText: { color: '#6B7280', fontStyle: 'italic', textAlign: 'center', marginTop: 20 },
});
