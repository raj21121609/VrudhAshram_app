import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';

export default function EmergencyAlertScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [residents, setResidents] = useState<{id: string, name: string}[]>([]);
  const [vrudhashramId, setVrudhashramId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [selectedResident, setSelectedResident] = useState('');
  const [issueType, setIssueType] = useState('health emergency');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: userData } = await supabase.from('users').select('vrudhashram_id').eq('id', user?.id).single();
      if (userData?.vrudhashram_id) {
        setVrudhashramId(userData.vrudhashram_id);
        const { data } = await supabase.from('residents').select('id, name').eq('vrudhashram_id', userData.vrudhashram_id);
        if (data) {
           setResidents(data);
           if (data.length > 0) setSelectedResident(data[0].id);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, // Allow both images and videos
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const submitAlert = async () => {
    if (!description || description.trim() === '') {
      Alert.alert('Error', 'Please provide a detailed description of the emergency.');
      return;
    }

    Alert.alert(
      "Confirm Emergency Alert",
      "Are you sure you want to trigger an emergency alert? This will immediately notify government officers.\n\nWarning: False alerts may result in legal action.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Submit Alert", 
          style: "destructive",
          onPress: async () => {
            setSubmitting(true);
            try {
              // Map UI issueType to database enum if needed
              let dbType = 'emergency';
              if (issueType === 'missing person') dbType = 'missing_report';
              // 'abuse or negligence' -> Map to 'inspection' or 'emergency' based on enum, lets use emergency with description holding details
              // Or update enum if needed. Schema has ('emergency', 'missing_report', 'inspection')
              if (issueType === 'abuse or negligence') dbType = 'inspection';

              const payload = {
                type: dbType,
                resident_id: selectedResident || null, // Allow general alerts without resident
                vrudhashram_id: vrudhashramId,
                description: `[${issueType.toUpperCase()}] ${description}`,
                status: 'pending' // As requested
              };

              const { error } = await supabase.from('alerts').insert(payload);
              if (error) throw error;
              
              Alert.alert('Alert Submitted', 'The emergency alert has been broadcasted successfully.', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error: any) {
              Alert.alert('Submission Error', error.message);
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const IssueTypeBtn = ({ label, value }: { label: string, value: string }) => (
    <TouchableOpacity 
      style={[styles.issueBtn, issueType === value && styles.issueBtnActive]} 
      onPress={() => setIssueType(value)}
    >
      <Text style={[styles.issueText, issueType === value && styles.issueTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Alert</Text>
      </View>

      <View style={styles.warningBanner}>
        <Ionicons name="warning" size={24} color="#991B1B" />
        <Text style={styles.warningText}>
          Warning: False alerts may result in legal action. Only use this for true emergencies.
        </Text>
      </View>

      <View style={styles.formContent}>
        
        <Text style={styles.label}>Select Resident (Optional for general alerts)</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedResident}
            onValueChange={(itemValue) => setSelectedResident(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="-- General Facility Alert --" value="" />
            {residents.map((r) => <Picker.Item key={r.id} label={r.name} value={r.id} />)}
          </Picker>
        </View>

        <Text style={styles.sectionTitle}>Issue Type</Text>
        <View style={styles.rowWrap}>
          <IssueTypeBtn label="Health Emergency" value="health emergency" />
          <IssueTypeBtn label="Injury / Fall" value="injury" />
          <IssueTypeBtn label="Abuse / Negligence" value="abuse or negligence" />
          <IssueTypeBtn label="Missing Person" value="missing person" />
        </View>

        <Text style={styles.sectionTitle}>Description</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder="Detailed description of the emergency..." 
          multiline 
          numberOfLines={6}
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
          <Ionicons name="camera-outline" size={24} color="#DC2626" />
          <Text style={styles.photoBtnText}>{photoUri ? 'Evidence Selected (Tap to change)' : 'Upload Photo/Video Evidence'}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]} 
          onPress={submitAlert} 
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="white" /> : (
            <>
              <Ionicons name="alert-circle" size={24} color="white" />
              <Text style={styles.submitBtnText}>TRIGGER EMERGENCY ALERT</Text>
            </>
          )}
        </TouchableOpacity>
        
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#FFFFFF', zIndex: 10 },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  warningBanner: { backgroundColor: '#FEF2F2', padding: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#FCA5A5', gap: 12 },
  warningText: { color: '#991B1B', fontWeight: '600', flex: 1 },
  formContent: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginTop: 24, marginBottom: 12 },
  pickerContainer: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, overflow: 'hidden', backgroundColor: '#F9FAFB' },
  picker: { height: 50 },
  rowWrap: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 10 },
  issueBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF', width: '48%' },
  issueBtnActive: { backgroundColor: '#FEF2F2', borderColor: '#DC2626' },
  issueText: { color: '#6B7280', fontWeight: '500', textAlign: 'center' },
  issueTextActive: { color: '#DC2626', fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#FFFFFF', marginTop: 8 },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderWidth: 1, borderColor: '#DC2626', borderStyle: 'dashed', borderRadius: 8, marginTop: 24, gap: 10, backgroundColor: '#FEF2F2' },
  photoBtnText: { color: '#DC2626', fontWeight: '600' },
  submitBtn: { backgroundColor: '#DC2626', padding: 16, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 30, gap: 10, shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
});
