import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../src/services/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

export default function ResidentProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  // Assigned Caretaker (Optional bonus field, mocked for simplicity or mapped if relational)
  const [assignedCaretaker, setAssignedCaretaker] = useState('Unassigned'); 

  useEffect(() => {
    if (id) fetchResident();
  }, [id]);

  const fetchResident = async () => {
    try {
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setName(data.name || '');
      setAge(data.age ? data.age.toString() : '');
      setGender(data.gender || 'Other');
      setRoomNumber(data.room_number || '');
      setAdmissionDate(data.admission_date || '');
      setEmergencyContact(data.emergency_contact || '');
      setMedicalConditions(data.medical_conditions || '');
      
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'Failed to load resident profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!name || !age || !roomNumber) {
      Alert.alert('Validation Error', 'Name, Age, and Room Number are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        age: parseInt(age),
        gender,
        room_number: roomNumber,
        emergency_contact: emergencyContact,
        medical_conditions: medicalConditions,
      };

      const { error } = await supabase
        .from('residents')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      
      Alert.alert('Success', 'Resident profile updated successfully!');
      setIsEditing(false);
      
    } catch (error: any) {
      Alert.alert('Update Failed', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const InputField = ({ label, value, onChangeText, multiline = false }: any) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {isEditing ? (
        <TextInput
          style={[styles.input, multiline && styles.textArea]}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          editable={true}
        />
      ) : (
        <Text style={styles.fieldValue}>{value || 'Not provided'}</Text>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resident Profile</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.editBtn}>
          <Ionicons name={isEditing ? "close" : "pencil"} size={20} color="#4F46E5" />
          <Text style={styles.editBtnText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : '?'}</Text>
        </View>
        <Text style={styles.profileName}>{name}</Text>
        <Text style={styles.profileSub}>Admitted: {admissionDate}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <InputField label="Full Name" value={name} onChangeText={setName} />
        
        {isEditing ? (
           <View style={{flexDirection: 'row', gap: 10, marginBottom: 16}}>
             <View style={{flex: 1}}>
                <Text style={styles.fieldLabel}>Age</Text>
                <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" />
             </View>
             <View style={{flex: 1}}>
                <Text style={styles.fieldLabel}>Gender</Text>
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={gender} onValueChange={setGender} style={{height: 48}}>
                    <Picker.Item label="Male" value="Male" />
                    <Picker.Item label="Female" value="Female" />
                    <Picker.Item label="Other" value="Other" />
                  </Picker>
                </View>
             </View>
           </View>
        ) : (
          <View style={{flexDirection: 'row', gap: 20}}>
            <InputField label="Age" value={age} />
            <InputField label="Gender" value={gender} />
          </View>
        )}
        
        <InputField label="Room Number" value={roomNumber} onChangeText={setRoomNumber} />
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Assigned Caretaker</Text>
          <Text style={styles.fieldValue}>{assignedCaretaker}</Text>
          {isEditing && <Text style={{fontSize: 12, color: '#9CA3AF', marginTop: 4}}>* Caretaker assignment must be done via scheduling module.</Text>}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Health & Emergency</Text>
        <InputField label="Emergency Contact" value={emergencyContact} onChangeText={setEmergencyContact} />
        <InputField label="Medical Conditions / Diet / Meds" value={medicalConditions} onChangeText={setMedicalConditions} multiline={true} />
      </View>

      {isEditing && (
        <TouchableOpacity 
          style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
          onPress={handleUpdate}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>
      )}

      <View style={{height: 40}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
  editBtnText: { color: '#4F46E5', fontWeight: '600', fontSize: 14 },
  profileHeader: { alignItems: 'center', padding: 24, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  profileSub: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  card: { backgroundColor: '#FFFFFF', margin: 16, marginBottom: 0, padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 8 },
  fieldContainer: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, color: '#6B7280', marginBottom: 4, fontWeight: '500' },
  fieldValue: { fontSize: 16, color: '#1F2937', fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#FFFFFF', color: '#1F2937' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  pickerWrapper: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  saveBtn: { backgroundColor: '#10B981', margin: 16, padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
