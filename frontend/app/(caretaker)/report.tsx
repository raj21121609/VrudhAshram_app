import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker'; // Note: might need to install @react-native-picker/picker

export default function DailyReportScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [residents, setResidents] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [selectedResident, setSelectedResident] = useState('');
  const [meals, setMeals] = useState({ breakfast: false, lunch: false, dinner: false });
  const [medicine, setMedicine] = useState({ given: false, time: '' });
  const [activity, setActivity] = useState('');
  const [hygiene, setHygiene] = useState({ bath: false, clothes: false });
  const [mood, setMood] = useState('');
  const [issues, setIssues] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    try {
      const { data: userData } = await supabase.from('users').select('vrudhashram_id').eq('id', user?.id).single();
      if (userData?.vrudhashram_id) {
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const submitReport = async () => {
    if (!selectedResident || !mood || !activity) {
      Alert.alert('Error', 'Please fill in required fields (Resident, Mood, Activity)');
      return;
    }

    setSubmitting(true);
    try {
      // Create simplified payload
      // (Actual implementation would handle file upload to storage bucker here first if photoUri exists)
      const payload = {
        resident_id: selectedResident,
        caretaker_id: user?.id,
        breakfast: meals.breakfast,
        lunch: meals.lunch,
        dinner: meals.dinner,
        medicine_given: medicine.given,
        medicine_time: medicine.time,
        activity,
        hygiene_bath: hygiene.bath,
        hygiene_clothes: hygiene.clothes,
        mood,
        issues,
      };

      const { error } = await supabase.from('daily_reports').insert(payload);
      
      if (error) throw error;
      
      Alert.alert('Success', 'Daily report submitted successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Submission Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const ToggleBtn = ({ label, value, onPress }: { label: string, value: boolean, onPress: () => void }) => (
    <TouchableOpacity 
      style={[styles.toggleBtn, value && styles.toggleBtnActive]} 
      onPress={onPress}
    >
      <Text style={[styles.toggleText, value && styles.toggleTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const SelectionOption = ({ label, selected, onSelect }: { label: string, selected: boolean, onSelect: () => void }) => (
    <TouchableOpacity 
      style={[styles.selectionOption, selected && styles.selectionOptionActive]} 
      onPress={onSelect}
    >
      <Text style={[styles.selectionText, selected && styles.selectionTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Report</Text>
      </View>

      <View style={styles.formContent}>
        
        {/* Resident Selection */}
        <Text style={styles.label}>Select Resident</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedResident}
            onValueChange={(itemValue) => setSelectedResident(itemValue)}
            style={styles.picker}
          >
            {residents.map((r) => <Picker.Item key={r.id} label={r.name} value={r.id} />)}
          </Picker>
        </View>

        {/* Meals */}
        <Text style={styles.sectionTitle}>Meals</Text>
        <View style={styles.row}>
          <ToggleBtn label="Breakfast" value={meals.breakfast} onPress={() => setMeals({...meals, breakfast: !meals.breakfast})} />
          <ToggleBtn label="Lunch" value={meals.lunch} onPress={() => setMeals({...meals, lunch: !meals.lunch})} />
          <ToggleBtn label="Dinner" value={meals.dinner} onPress={() => setMeals({...meals, dinner: !meals.dinner})} />
        </View>

        {/* Medicine */}
        <Text style={styles.sectionTitle}>Medicine</Text>
        <View style={styles.row}>
          <ToggleBtn label="Medicine Given" value={medicine.given} onPress={() => setMedicine({...medicine, given: !medicine.given})} />
        </View>
        {medicine.given && (
          <TextInput 
            style={styles.input} 
            placeholder="Time (e.g. 08:00 AM, 08:00 PM)" 
            value={medicine.time} 
            onChangeText={(t) => setMedicine({...medicine, time: t})} 
          />
        )}

        {/* Physical Activity */}
        <Text style={styles.sectionTitle}>Physical Activity</Text>
        <View style={styles.rowWrap}>
          <SelectionOption label="Walking" selected={activity === 'walking'} onSelect={() => setActivity('walking')} />
          <SelectionOption label="Light Exercise" selected={activity === 'light exercise'} onSelect={() => setActivity('light exercise')} />
          <SelectionOption label="Bed Rest" selected={activity === 'bed rest'} onSelect={() => setActivity('bed rest')} />
        </View>

        {/* Hygiene */}
        <Text style={styles.sectionTitle}>Hygiene Care</Text>
        <View style={styles.row}>
          <ToggleBtn label="Bathing Completed" value={hygiene.bath} onPress={() => setHygiene({...hygiene, bath: !hygiene.bath})} />
          <ToggleBtn label="Clothes Changed" value={hygiene.clothes} onPress={() => setHygiene({...hygiene, clothes: !hygiene.clothes})} />
        </View>

        {/* Mood */}
        <Text style={styles.sectionTitle}>Mood</Text>
        <View style={styles.rowWrap}>
          <SelectionOption label="Happy" selected={mood === 'happy'} onSelect={() => setMood('happy')} />
          <SelectionOption label="Normal" selected={mood === 'normal'} onSelect={() => setMood('normal')} />
          <SelectionOption label="Sad" selected={mood === 'sad'} onSelect={() => setMood('sad')} />
          <SelectionOption label="Aggressive" selected={mood === 'aggressive'} onSelect={() => setMood('aggressive')} />
        </View>

        {/* Additional Fields */}
        <Text style={styles.sectionTitle}>Additional Issues / Injury</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder="Describe any issues or injuries..." 
          multiline 
          numberOfLines={4}
          value={issues}
          onChangeText={setIssues}
        />

        <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
          <Ionicons name="camera-outline" size={24} color="#4F46E5" />
          <Text style={styles.photoBtnText}>{photoUri ? 'Photo Selected (Tap to change)' : 'Upload Photo (Optional)'}</Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity 
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]} 
          onPress={submitReport} 
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Submit Report</Text>}
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
  formContent: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginTop: 24, marginBottom: 12 },
  pickerContainer: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, overflow: 'hidden', backgroundColor: '#F9FAFB' },
  picker: { height: 50 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  rowWrap: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 10 },
  toggleBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center', backgroundColor: '#FFFFFF' },
  toggleBtnActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  toggleText: { color: '#6B7280', fontWeight: '500' },
  toggleTextActive: { color: '#4F46E5', fontWeight: 'bold' },
  selectionOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF' },
  selectionOptionActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  selectionText: { color: '#6B7280' },
  selectionTextActive: { color: '#4F46E5', fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#FFFFFF', marginTop: 8 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderWidth: 1, borderColor: '#4F46E5', borderStyle: 'dashed', borderRadius: 8, marginTop: 24, gap: 10, backgroundColor: '#EEF2FF' },
  photoBtnText: { color: '#4F46E5', fontWeight: '600' },
  submitBtn: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
