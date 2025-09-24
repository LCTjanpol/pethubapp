import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, ENDPOINTS } from '../../config/api';

const AddVaccineScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { petId } = route.params as { petId: number };
  const [vaccine, setVaccine] = useState({ vaccineName: '', date: '', expiration: '' });
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isExpirationPickerVisible, setExpirationPickerVisibility] = useState(false);
  const [activeDateField, setActiveDateField] = useState('');
  const [records, setRecords] = useState<any[]>([]);

  const handleConfirmDate = (date: Date) => {
    const formattedDate = date.toISOString().split('T')[0];
    if (activeDateField === 'date') {
      setVaccine({ ...vaccine, date: formattedDate });
      setDatePickerVisibility(false);
    } else if (activeDateField === 'expiration') {
      setVaccine({ ...vaccine, expiration: formattedDate });
      setExpirationPickerVisibility(false);
    }
  };

  const showDatePicker = (field: 'date' | 'expiration') => {
    setActiveDateField(field);
    if (field === 'date') {
      setDatePickerVisibility(true);
    } else if (field === 'expiration') {
      setExpirationPickerVisibility(true);
    }
  };

  const clearVaccineForm = () => {
    setVaccine({ vaccineName: '', date: '', expiration: '' });
  };

  const validateVaccinationDates = (date: string, expiration: string) => {
    const vaccinationDate = new Date(date);
    const expirationDate = new Date(expiration);
    const today = new Date();
    
    if (vaccinationDate > today) {
      Alert.alert('Invalid Date', 'Vaccination date should be today and cannot be in the future');
      return false;
    }
    
    if (expirationDate <= vaccinationDate) {
      Alert.alert('Invalid Expiration', 'Expiration date must be after vaccination date');
      return false;
    }
    
    return true;
  };

  const handleAddVaccine = async () => {
    if (!vaccine.vaccineName || !vaccine.date || !vaccine.expiration) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    
    if (!validateVaccinationDates(vaccine.date, vaccine.expiration)) {
      return;
    }
    
    // Check for duplicate vaccination records
    const isDuplicate = records.some(record => 
      record.vaccineName === vaccine.vaccineName && 
      new Date(record.date).toDateString() === new Date(vaccine.date).toDateString()
    );
    
    if (isDuplicate) {
      Alert.alert('Warning', 'A vaccination record with the same name and date already exists. Please check your records or choose a different date.');
      return;
    }
    
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'No token found. Please log in again.');
        return;
      }
      await apiClient.post(
        ENDPOINTS.VACCINATION.LIST,
        {
          vaccineName: vaccine.vaccineName,
          date: vaccine.date,
          expirationDate: vaccine.expiration,
          petId: Number(petId),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchRecords();
      clearVaccineForm();
      Alert.alert('Success', 'Vaccine added!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to add vaccine: ' + (error?.response?.data?.message || error?.message || 'Unknown error'));
    }
  };

  const fetchRecords = React.useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const res = await apiClient.get(ENDPOINTS.VACCINATION.LIST, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecords(res.data.filter((r: any) => r.petId === Number(petId)));
    } catch {}
  }, [petId]);

  useFocusEffect(
    React.useCallback(() => {
      const fetchData = async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          if (!token) return;
          const res = await apiClient.get(ENDPOINTS.VACCINATION.LIST, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setRecords(res.data.filter((r: any) => r.petId === Number(petId)));
        } catch {}
      };
      fetchData();
    }, [petId])
  );

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Delete Vaccination Record',
      'Are you sure you want to delete this vaccination record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) return;
              await apiClient.delete(ENDPOINTS.VACCINATION.DETAIL(id.toString()), {
                headers: { Authorization: `Bearer ${token}` },
              });
              fetchRecords();
              Alert.alert('Success', 'Vaccination record deleted!');
            } catch {
              Alert.alert('Error', 'Failed to delete record');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>Add Vaccination</Text>
      <TextInput
        style={styles.input}
        placeholder="Vaccine Name"
        value={vaccine.vaccineName}
        onChangeText={(text) => setVaccine({ ...vaccine, vaccineName: text })}
      />
      <TouchableOpacity onPress={() => showDatePicker('date')} style={styles.dateInput}>
        <Text style={styles.dateText}>
          {vaccine.date || 'Vaccination Date (YYYY-MM-DD)'}
        </Text>
      </TouchableOpacity>
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={() => setDatePickerVisibility(false)}
      />
      <TouchableOpacity onPress={() => showDatePicker('expiration')} style={styles.dateInput}>
        <Text style={styles.dateText}>
          {vaccine.expiration || 'Expiration Date (YYYY-MM-DD)'}
        </Text>
      </TouchableOpacity>
      <DateTimePickerModal
        isVisible={isExpirationPickerVisible}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={() => setExpirationPickerVisibility(false)}
      />
      <TouchableOpacity style={styles.submitButton} onPress={handleAddVaccine}>
        <Text style={styles.submitButtonText}>Add Vaccine</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 20 }}>Vaccination Records</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        {records.map((rec) => (
          <View key={rec.id} style={styles.recordBox}>
            <View style={styles.recordHeader}><Text style={styles.recordHeaderText}>{rec.vaccineName}</Text></View>
            <Text style={styles.recordLabel}>Date of Vaccination</Text>
            <View style={styles.recordField}><Text>{rec.date ? new Date(rec.date).toLocaleDateString() : ''}</Text></View>
            <Text style={styles.recordLabel}>Expiration of Vaccine</Text>
            <View style={styles.recordField}><Text>{rec.expirationDate ? new Date(rec.expirationDate).toLocaleDateString() : ''}</Text></View>
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(rec.id)}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#fff' },
  headerText: { fontSize: 24, fontWeight: 'bold', color: '#000', marginBottom: 10, marginTop: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  dateText: { color: '#666' },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  submitButtonText: { color: '#fff', fontWeight: 'bold' },
  recordBox: {
    backgroundColor: '#ddd',
    borderRadius: 18,
    padding: 16,
    marginRight: 16,
    width: 220,
    shadowColor: '#bbb',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
    height: 300
  },
  recordHeader: {
    backgroundColor: '#181515',
    borderRadius: 4,
    width: '100%',
    marginBottom: 8,
    padding: 4,
    alignItems: 'center',
  },
  recordHeaderText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  recordLabel: {
    fontWeight: 'bold',
    fontSize: 15,
    marginTop: 4,
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  recordField: {
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    width: '100%',
    padding: 6,
    marginBottom: 6,
  },
  deleteButton: {
    backgroundColor: '#181515',
    borderRadius: 4,
    width: '100%',
    alignItems: 'center',
    padding: 8,
    marginTop: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default AddVaccineScreen;