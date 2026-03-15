import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

type Resident = {
  id: string;
  name: string;
  age: number;
  gender: string;
  room_number: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [residents, setResidents] = useState<Resident[]>([]);
  const [stats, setStats] = useState({ total: 0, male: 0, female: 0 });
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 15;

  const fetchAdminData = async (isLoadMore = false) => {
    try {
      // 1. Get Admin's Vrudhashram ID
      const { data: userData } = await supabase
        .from('users')
        .select('vrudhashram_id')
        .eq('id', user?.id)
        .single();

      if (!userData?.vrudhashram_id) throw new Error("No Vrudhashram assigned");

      // 2. Fetch residents for this Vrudhashram with Pagination
      const from = isLoadMore ? page * PAGE_SIZE : 0;
      const to = from + PAGE_SIZE - 1;

      // Note: Full stats query should ideally be a separate RPC/Edge function
      // For scalability, we fetch total count and paginated items.
      const { data: resData, error, count } = await supabase
        .from('residents')
        .select('id, name, age, gender, room_number', { count: 'exact' })
        .eq('vrudhashram_id', userData.vrudhashram_id)
        .order('name', { ascending: true })
        .range(from, to);

      if (error) throw error;

      const newResidents = resData || [];
      if (isLoadMore) {
        setResidents(prev => [...prev, ...newResidents]);
      } else {
        setResidents(newResidents);
      }

      setHasMore(newResidents.length === PAGE_SIZE);
      if (!isLoadMore) setPage(1);
      else setPage(prev => prev + 1);

      // 3. Stats (In production, this should be pre-aggregated, keeping simple for demo but relying on specific queries)
      if (!isLoadMore) {
        const { count: mCount } = await supabase.from('residents').select('id', { count: 'exact', head: true }).eq('vrudhashram_id', userData.vrudhashram_id).eq('gender', 'Male');
        const { count: fCount } = await supabase.from('residents').select('id', { count: 'exact', head: true }).eq('vrudhashram_id', userData.vrudhashram_id).ilike('gender', 'Female');
        
        setStats({
          total: count || 0,
          male: mCount || 0,
          female: fCount || 0
        });
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMoreData = () => {
    if (!loading && !refreshing && hasMore) {
      fetchAdminData(true);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  const filteredResidents = residents.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.room_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const StatCard = ({ title, value, color, icon }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

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
          <Text style={styles.title}>Admin Portal</Text>
          <Text style={styles.subtitle}>Vrudhashram Management</Text>
        </View>
        <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredResidents}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMoreData}
        onEndReachedThreshold={0.5}
        ListFooterComponent={hasMore && filteredResidents.length > 0 ? <ActivityIndicator style={{ margin: 20 }} color="#4F46E5" /> : null}
        ListHeaderComponent={
          <>
            <View style={styles.statsRow}>
              <StatCard title="Total" value={stats.total} color="#4F46E5" icon="people" />
              <StatCard title="Male" value={stats.male} color="#3B82F6" icon="man" />
              <StatCard title="Female" value={stats.female} color="#EC4899" icon="woman" />
            </View>

            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={styles.addBtn}
                onPress={() => router.push('/(admin)/add-resident')}
              >
                <Ionicons name="person-add" size={20} color="white" />
                <Text style={styles.addBtnText}>Add New Resident</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search residents by name or room..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            
            <Text style={styles.listHeaderTitle}>Resident Directory</Text>
          </>
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No residents found matching your search.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.residentCard}
            onPress={() => router.push(`/(admin)/resident/${item.id}` as any)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.residentInfo}>
              <Text style={styles.residentName}>{item.name}</Text>
              <Text style={styles.residentSubInfo}>Age: {item.age} • Gender: {item.gender} • Room: {item.room_number}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { padding: 24, paddingTop: 60, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, zIndex: 10 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  logoutBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8 },
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, alignItems: 'center' },
  iconBox: { padding: 8, borderRadius: 12, marginBottom: 8 },
  statContent: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  statTitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  actionsContainer: { paddingHorizontal: 16, marginBottom: 16 },
  addBtn: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 16, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', height: 48 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#111827' },
  listHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginHorizontal: 16, marginTop: 24, marginBottom: 8 },
  listContainer: { paddingBottom: 100 },
  emptyContainer: { padding: 30, alignItems: 'center' },
  emptyText: { color: '#6B7280', textAlign: 'center' },
  residentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, marginHorizontal: 16, marginBottom: 10, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#4F46E5' },
  residentInfo: { flex: 1 },
  residentName: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  residentSubInfo: { fontSize: 13, color: '#6B7280' },
});
