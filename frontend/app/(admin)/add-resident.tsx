import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

export default function AddResidentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [vrudhashramId, setVrudhashramId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [roomNumber, setRoomNumber] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [dietary, setDietary] = useState('');

  useEffect(() => {
    // Get Admin's Vrudhashram ID on load
    const fetchAdminInfo = async () => {
      const { data } = await supabase.from('users').select('vrudhashram_id').eq('id', user?.id).single();
      if (data?.vrudhashram_id) setVrudhashramId(data.vrudhashram_id);
    };
    fetchAdminInfo();
  }, [user]);

  const handleSave = async () => {
    if (!name || !age || !roomNumber) {
      Alert.alert('Error', 'Please fill in Name, Age, and Room Number.');
      return;
    }

    if (!vrudhashramId) {
      Alert.alert('Error', 'Admin is not assigned to a valid Vrudhashram.');
      return;
    }

    setLoading(true);
    try {
      // We append dietary info to medical_conditions since it's not explicitly in the schema yet
      const combinedMedicalInfo = dietary.trim() 
        ? `${medicalConditions}\n[Dietary]: ${dietary}`
        : medicalConditions;

      const payload = {
        name,
        age: parseInt(age),
        gender,
        room_number: roomNumber,
        medical_conditions: combinedMedicalInfo,
        emergency_contact: emergencyContact,
        vrudhashram_id: vrudhashramId,
      };

      const { error } = await supabase.from('residents').insert(payload);
      if (error) throw error;
      
      Alert.alert('Success', 'New resident successfully admitted!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error adding resident', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admit New Resident</Text>
      </View>

      <View style={styles.formContainer}>
        
        <Text style={styles.sectionHeader}>Basic Information</Text>
        
        <Text style={styles.label}>Full Name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. John Doe" />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Age *</Text>
            <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" placeholder="e.g. 75" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Gender *</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={gender} onValueChange={setGender} style={styles.picker}>
                <Picker.Item label="Male" value="Male" />
                <Picker.Item label="Female" value="Female" />
                <Picker.Item label="Other" value="Other" />
              </Picker>
            </View>
          </View>
        </View>

        <Text style={styles.label}>Room Number *</Text>
        <TextInput style={styles.input} value={roomNumber} onChangeText={setRoomNumber} placeholder="e.g. Wing-A 101" />

        <Text style={styles.sectionHeader}>Health & Emergency</Text>
        
        <Text style={styles.label}>Emergency Contact</Text>
        <TextInput style={styles.input} value={emergencyContact} onChangeText={setEmergencyContact} placeholder="Name & Phone Number" />

        <Text style={styles.label}>Medical Conditions & Medications</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          value={medicalConditions} 
          onChangeText={setMedicalConditions} 
          multiline 
          numberOfLines={4} 
          placeholder="List chronic conditions, allergies, and daily meds..." 
        />
        
        <Text style={styles.label}>Dietary Restrictions</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          value={dietary} 
          onChangeText={setDietary} 
          multiline 
          numberOfLines={2} 
          placeholder="e.g. Diabetic, No sugar, Vegetarian" 
        />

        <TouchableOpacity 
          style={[styles.submitBtn, loading && { opacity: 0.7 }]} 
          onPress={handleSave} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Admit Resident</Text>}
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#FFFFFF' },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  formContainer: { padding: 20, paddingBottom: 60 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#4F46E5', marginTop: 10, marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 14, fontSize: 16, backgroundColor: '#F9FAFB', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  pickerWrapper: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, backgroundColor: '#F9FAFB', marginBottom: 16, overflow: 'hidden' },
  picker: { height: 50 },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
