import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, Text, Image, StyleSheet, TouchableOpacity, Alert, ScrollView, 
  Modal, TextInput, KeyboardAvoidingView, Platform, RefreshControl,
  FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { apiClient, ENDPOINTS, API_URL } from '../../config/api';
import { PetHubColors } from '../../constants/Colors';

// Types for pets, tasks, and medical records
interface Pet {
  id: number;
  name: string;
  petPicture?: string;
  age: number;
  type: string;
  breed: string;
  tasks: Task[];
  medicalRecords: MedicalRecord[];
}

interface Task {
  id: number;
  type: string;
  description: string;
  time: string;
  frequency?: string;
  petId: number;
  createdAt: string;
}

interface MedicalRecord {
  id: number;
  diagnose: string;
  vetName: string;
  medication: string;
  description: string;
  date: string;
  createdAt: string;
}

interface CustomTask {
  name: string;
  description: string;
  time: string;
  frequency: string;
  day?: string; // For weekly tasks
  date?: string; // For scheduled tasks
}

interface MedicalRecordForm {
  date: string;
  description: string;
  vetName: string;
  medication: string;
  diagnose: string;
}

const PetsScreen = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

  // Helper function to generate proper image URLs
  const getImageUrl = (imagePath: string | undefined): { uri: string } | number => {
    if (!imagePath) {
      return require('../../assets/images/pet.png');
    }
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) {
      return { uri: imagePath };
    }
    
    // If it starts with /uploads, construct the full URL using API base URL
    if (imagePath.startsWith('/uploads')) {
      const baseUrl = API_URL.replace('/api', ''); // Remove /api suffix to get base URL
      return { uri: `${baseUrl}${imagePath}` };
    }
    
    // Fallback to default pet image
    return require('../../assets/images/pet.png');
  };
  
  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [showPetDetailsModal, setShowPetDetailsModal] = useState(false);
  
  // Task form states
  const [customTask, setCustomTask] = useState<CustomTask>({
    name: '',
    description: '',
    time: '',
    frequency: 'daily'
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTaskDatePicker, setShowTaskDatePicker] = useState(false);
  
  // Medical record form states
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecordForm>({
    date: '',
    description: '',
    vetName: '',
    medication: '',
    diagnose: ''
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Task edit/delete states
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskTime, setEditTaskTime] = useState('');
  const [editTaskFrequency, setEditTaskFrequency] = useState('daily');
  const [isEditTimePickerVisible, setEditTimePickerVisibility] = useState(false);
  const [isEditDatePickerVisible, setEditDatePickerVisibility] = useState(false);
  const [isEditModalVisible, setEditModalVisibility] = useState(false);

  // Medical record edit/delete states
  const [editingMedicalRecord, setEditingMedicalRecord] = useState<MedicalRecord | null>(null);
  const [editMedicalDate, setEditMedicalDate] = useState('');
  const [editMedicalDescription, setEditMedicalDescription] = useState('');
  const [editMedicalVetName, setEditMedicalVetName] = useState('');
  const [editMedicalMedication, setEditMedicalMedication] = useState('');
  const [editMedicalDiagnose, setEditMedicalDiagnose] = useState('');
  const [isEditMedicalDatePickerVisible, setEditMedicalDatePickerVisibility] = useState(false);
  const [isEditMedicalModalVisible, setEditMedicalModalVisibility] = useState(false);
  

  // Fetch pets with their tasks and vaccination records
  const fetchPets = useCallback(async (token?: string) => {
    try {
      if (!token) {
        const t = await AsyncStorage.getItem('token');
        if (!t) {
          Alert.alert('Error', 'No token found. Please log in again.');
          return;
        }
        token = t;
      }

      const response = await apiClient.get(ENDPOINTS.PET.LIST, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Fetch tasks and vaccination records for each pet
      const petsWithDetails = await Promise.all(
        response.data.map(async (pet: Pet) => {
          try {
            // Fetch tasks for this pet
            let tasks = [];
            try {
              const tasksResponse = await apiClient.get(`${ENDPOINTS.TASK.LIST}?petId=${pet.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              tasks = tasksResponse.data || [];
            } catch (taskError) {
              console.error(`Error fetching tasks for pet ${pet.id}:`, taskError);
              // Continue without tasks if there's an error
            }

            // Fetch medical records for this pet
            let medicalRecords = [];
            try {
              const medicalResponse = await apiClient.get(`${ENDPOINTS.MEDICAL_RECORD.LIST}?petId=${pet.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              // Ensure we have a valid array - check both response.data and response.data.data
              medicalRecords = medicalResponse.data?.data || medicalResponse.data || [];
              // Additional safety check to ensure it's an array
              if (!Array.isArray(medicalRecords)) {
                medicalRecords = [];
              }
            } catch (medicalError) {
              console.error(`Error fetching medical records for pet ${pet.id}:`, medicalError);
              // Continue without medical records if there's an error
              medicalRecords = [];
            }

            return {
              ...pet,
              tasks,
              medicalRecords
            };
          } catch (error) {
            console.error(`Error fetching details for pet ${pet.id}:`, error);
            return {
              ...pet,
              tasks: [],
              medicalRecords: []
            };
          }
        })
      );

      setPets(petsWithDetails);
    } catch (error: any) {
      console.error('Error fetching pets:', error);
      Alert.alert('Error', 'Failed to fetch pets: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Add custom task
  const handleAddTask = async () => {
    // Validate required fields based on frequency
    if (!selectedPet || !customTask.name.trim() || !customTask.description.trim() || !customTask.time) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate frequency-specific fields
    if (customTask.frequency === 'weekly' && !customTask.day) {
      Alert.alert('Error', 'Please select a day for weekly tasks');
      return;
    }

    if (customTask.frequency === 'scheduled' && !customTask.date) {
      Alert.alert('Error', 'Please select a date for scheduled tasks');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No token');

      // Convert time to proper format for API
      const taskTime = new Date();
      const [hours, minutes] = customTask.time.split(':');
      
      if (customTask.frequency === 'scheduled' && customTask.date) {
        // For scheduled tasks, combine date and time
        const [year, month, day] = customTask.date.split('-');
        taskTime.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      
      taskTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Create description with frequency-specific information
      let taskDescription = customTask.description;
      if (customTask.frequency === 'weekly' && customTask.day) {
        taskDescription += ` (Every ${customTask.day.charAt(0).toUpperCase() + customTask.day.slice(1)})`;
      } else if (customTask.frequency === 'scheduled' && customTask.date) {
        taskDescription += ` (Scheduled for ${formatDate(customTask.date)})`;
      }

      await apiClient.post(ENDPOINTS.TASK.CREATE, {
        petId: selectedPet.id,
        type: customTask.name, // Use the actual task name as the type
        description: taskDescription,
        time: taskTime.toISOString(),
        frequency: customTask.frequency
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('Success', 'Task added successfully!');
      setShowTaskModal(false);
      setCustomTask({ name: '', description: '', time: '', frequency: 'daily' });
      fetchPets(token);
    } catch (error: any) {
      console.error('Error adding task:', error);
      if (error.response?.status === 401) {
        Alert.alert('Authentication Error', 'Please log in again to add tasks.');
      } else if (error.response?.status === 400) {
        Alert.alert('Validation Error', error.response?.data?.message || 'Please check your input and try again.');
      } else {
        Alert.alert('Error', 'Failed to add task. Please try again.');
      }
    }
  };

  // Add medical record (using vaccination endpoint for now)
  const handleAddMedicalRecord = async () => {
    if (!selectedPet || !medicalRecord.date || !medicalRecord.description.trim() || 
        !medicalRecord.diagnose.trim() || !medicalRecord.vetName.trim() || !medicalRecord.medication.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No token');

      await apiClient.post(ENDPOINTS.MEDICAL_RECORD.CREATE, {
        petId: selectedPet.id,
        diagnose: medicalRecord.diagnose,
        vetName: medicalRecord.vetName,
        medication: medicalRecord.medication,
        description: medicalRecord.description,
        date: medicalRecord.date
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('Success', 'Medical record added successfully!');
      setShowMedicalModal(false);
      setMedicalRecord({
        date: '',
        description: '',
        vetName: '',
        medication: '',
        diagnose: ''
      });
      fetchPets(token);
    } catch (error: any) {
      console.error('Error adding medical record:', error);
      Alert.alert('Error', 'Failed to add medical record');
    }
  };

  // Handle time selection for tasks
  const handleTimeConfirm = (time: Date) => {
    const formattedTime = time.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
    setCustomTask(prev => ({ ...prev, time: formattedTime }));
    setShowTimePicker(false);
  };

  // Handle date selection for scheduled tasks
  const handleDateConfirm = (date: Date) => {
    const formattedDate = date.toISOString().split('T')[0];
    setCustomTask(prev => ({ ...prev, date: formattedDate }));
    setShowTaskDatePicker(false);
  };

  // Handle date selection for medical records
  const handleMedicalDateConfirm = (date: Date) => {
    const formattedDate = date.toISOString().split('T')[0];
    setMedicalRecord(prev => ({ ...prev, date: formattedDate }));
    setShowDatePicker(false);
  };

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPets();
    setRefreshing(false);
  };

  // Format time display
  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeString;
    }
  };

  // Format date display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Edit task functionality
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setEditTaskName(task.type);
    setEditTaskDescription(task.description);
    setEditTaskTime(task.time);
    setEditTaskFrequency(task.frequency || 'daily');
    setEditModalVisibility(true);
  };

  // Handle edit time selection
  const handleEditTimeConfirm = (time: Date) => {
    const formattedTime = time.toISOString();
    setEditTaskTime(formattedTime);
    setEditTimePickerVisibility(false);
  };

  // Handle edit date selection
  const handleEditDateConfirm = (date: Date) => {
    const formattedDate = date.toISOString();
    setEditTaskTime(formattedDate);
    setEditDatePickerVisibility(false);
  };

  // Save edited task
  const handleSaveEditedTask = async () => {
    if (!editingTask || !editTaskName || !editTaskTime) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const taskData = {
        type: editTaskName,
        description: editTaskDescription,
        time: editTaskTime,
        petId: editingTask.petId,
        frequency: editTaskFrequency,
      };

      await apiClient.put(ENDPOINTS.TASK.UPDATE(editingTask.id.toString()), taskData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Refresh pets to get updated data
      if (token) await fetchPets(token);
      
      // Close modal and reset state
      setEditModalVisibility(false);
      setEditingTask(null);
      setEditTaskName('');
      setEditTaskDescription('');
      setEditTaskTime('');
      setEditTaskFrequency('daily');
      Alert.alert('Success', 'Task updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update task: ' + (error?.message || 'Unknown error'));
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditModalVisibility(false);
    setEditingTask(null);
    setEditTaskName('');
    setEditTaskDescription('');
    setEditTaskTime('');
    setEditTaskFrequency('daily');
  };

  // Delete task
  const handleDeleteTask = async (taskId: number) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await apiClient.delete(ENDPOINTS.TASK.DELETE(taskId.toString()), {
                headers: { Authorization: `Bearer ${token}` },
              });
              
              // Refresh pets to get updated data
              if (token) await fetchPets(token);
              Alert.alert('Success', 'Task deleted successfully!');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete task: ' + (error?.message || 'Unknown error'));
            }
          },
        },
      ]
    );
  };

  // Edit medical record
  const handleEditMedicalRecord = (medicalRecord: MedicalRecord) => {
    setEditingMedicalRecord(medicalRecord);
    setEditMedicalDate(medicalRecord.date);
    setEditMedicalDescription(medicalRecord.description);
    setEditMedicalVetName(medicalRecord.vetName);
    setEditMedicalMedication(medicalRecord.medication);
    setEditMedicalDiagnose(medicalRecord.diagnose);
    setEditMedicalModalVisibility(true);
  };

  // Handle edit medical record date confirmation
  const handleEditMedicalDateConfirm = (date: Date) => {
    setEditMedicalDate(date.toISOString());
    setEditMedicalDatePickerVisibility(false);
  };

  // Save edited medical record
  const handleSaveEditedMedicalRecord = async () => {
    if (!editingMedicalRecord || !editMedicalDiagnose || !editMedicalVetName || !editMedicalMedication || !editMedicalDescription || !editMedicalDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const medicalData = {
        diagnose: editMedicalDiagnose,
        vetName: editMedicalVetName,
        medication: editMedicalMedication,
        description: editMedicalDescription,
        date: editMedicalDate,
      };

      await apiClient.put(ENDPOINTS.MEDICAL_RECORD.UPDATE(editingMedicalRecord.id.toString()), medicalData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Refresh pets to get updated data
      if (token) await fetchPets(token);
      
      // Close modal and reset state
      setEditMedicalModalVisibility(false);
      setEditingMedicalRecord(null);
      setEditMedicalDate('');
      setEditMedicalDescription('');
      setEditMedicalVetName('');
      setEditMedicalMedication('');
      setEditMedicalDiagnose('');
      Alert.alert('Success', 'Medical record updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update medical record: ' + (error?.message || 'Unknown error'));
    }
  };

  // Cancel medical record edit
  const handleCancelMedicalEdit = () => {
    setEditMedicalModalVisibility(false);
    setEditingMedicalRecord(null);
    setEditMedicalDate('');
    setEditMedicalDescription('');
    setEditMedicalVetName('');
    setEditMedicalMedication('');
    setEditMedicalDiagnose('');
  };

  // Delete medical record
  const handleDeleteMedicalRecord = async (medicalRecordId: number) => {
    Alert.alert(
      'Delete Medical Record',
      'Are you sure you want to delete this medical record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await apiClient.delete(ENDPOINTS.MEDICAL_RECORD.DELETE(medicalRecordId.toString()), {
                headers: { Authorization: `Bearer ${token}` },
              });
              
              // Refresh pets to get updated data
              if (token) await fetchPets(token);
              Alert.alert('Success', 'Medical record deleted successfully!');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete medical record: ' + (error?.message || 'Unknown error'));
            }
          },
        },
      ]
    );
  };

  // Use ref to store the fetch function to avoid dependency issues
  const fetchPetsRef = useRef(fetchPets);
  fetchPetsRef.current = fetchPets;

  // Initialize data - only run once on mount
  useEffect(() => {
    fetchPetsRef.current();
  }, []); // Empty dependency array to run only once

  // Refresh on focus - but not on every focus
  useFocusEffect(
    useCallback(() => {
      // Only refresh if pets are empty or it's been more than 30 seconds
      const lastRefresh = Date.now() - (pets.length > 0 ? 30000 : 0);
      if (pets.length === 0 || Date.now() - lastRefresh > 30000) {
        fetchPetsRef.current();
      }
    }, [pets.length]) // Only depend on pets length, not the entire function
  );

  // Render task item
  const renderTask = ({ item }: { item: Task }) => (
    <View style={styles.taskItem}>
      <View style={styles.taskInfo}>
        <Text style={styles.taskType}>{item.type}</Text>
        <Text style={styles.taskDescription}>{item.description}</Text>
        <Text style={styles.taskTime}>⏰ {formatTime(item.time)}</Text>
      </View>
      <View style={styles.taskActions}>
        <TouchableOpacity
          style={styles.editTaskButton}
          onPress={() => handleEditTask(item)}
        >
          <Text style={styles.editTaskButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteTaskButton}
          onPress={() => handleDeleteTask(item.id)}
        >
          <Text style={styles.deleteTaskButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render medical record item
  const renderMedicalRecord = ({ item }: { item: MedicalRecord }) => (
    <View style={styles.medicalItem}>
      <View style={styles.medicalInfo}>
        <Text style={styles.medicalName}>{item.diagnose}</Text>
        <Text style={styles.medicalDate}>📅 {formatDate(item.date)}</Text>
        <Text style={styles.medicalVet}>👨‍⚕️ Dr. {item.vetName}</Text>
        <Text style={styles.medicalMedication}>💊 {item.medication}</Text>
        <Text style={styles.medicalDescription}>{item.description}</Text>
      </View>
      <View style={styles.medicalActions}>
        <TouchableOpacity
          style={styles.editMedicalButton}
          onPress={() => handleEditMedicalRecord(item)}
        >
          <Text style={styles.editMedicalButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteMedicalButton}
          onPress={() => handleDeleteMedicalRecord(item.id)}
        >
          <Text style={styles.deleteMedicalButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render individual pet card
  const renderPet = (pet: Pet) => (
    <View key={pet.id} style={styles.petCard}>
      <TouchableOpacity 
        onPress={() => {
          setSelectedPet(pet);
          setShowPetDetailsModal(true);
        }}
        style={styles.petHeader}
      >
        <Image
          source={getImageUrl(pet.petPicture)}
          style={styles.petImage}
        />
      <View style={styles.petInfo}>
          <Text style={styles.petName}>{pet.name}</Text>
          <Text style={styles.petDetails}>{pet.type} • {pet.breed}</Text>
          <Text style={styles.petAge}>{pet.age} years old</Text>
      </View>
      </TouchableOpacity>

      <View style={styles.petStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{pet.tasks?.length || 0}</Text>
          <Text style={styles.statLabel}>Tasks</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{pet.medicalRecords?.length || 0}</Text>
          <Text style={styles.statLabel}>Records</Text>
        </View>
      </View>

      <View style={styles.petActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            setSelectedPet(pet);
            setShowTaskModal(true);
          }}
        >
          <Text style={styles.actionButtonText}>+ Task</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            setSelectedPet(pet);
            setShowMedicalModal(true);
          }}
        >
          <Text style={styles.actionButtonText}>+ Medical</Text>
      </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push(`/editandaddscreens/editpetprofile?petId=${pet.id}`)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
      </TouchableOpacity>
      </View>
    </View>
  );

  return (
      <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Pets</Text>
        <TouchableOpacity
          style={styles.addPetButton}
          onPress={() => router.push('/editandaddscreens/addpet')}
        >
          <Text style={styles.addPetButtonText}>+ Add Pet</Text>
        </TouchableOpacity>
      </View>

      {/* Pets List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading pets...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.petsContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {pets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No pets added yet</Text>
              <Text style={styles.emptySubtext}>Add your first pet to get started!</Text>
            </View>
          ) : (
            pets.map(renderPet)
          )}
        </ScrollView>
      )}

      {/* Pet Details Modal */}
      <Modal
        visible={showPetDetailsModal}
        animationType="slide"
        onRequestClose={() => setShowPetDetailsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPetDetailsModal(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedPet?.name}</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedPet && (
              <>
                {/* Pet Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Pet Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>{selectedPet.type}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Breed:</Text>
                    <Text style={styles.detailValue}>{selectedPet.breed}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Age:</Text>
                    <Text style={styles.detailValue}>{selectedPet.age} years</Text>
                  </View>
                </View>

                {/* Tasks */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Tasks ({selectedPet.tasks?.length || 0})</Text>
                  {(!selectedPet.tasks || selectedPet.tasks.length === 0) ? (
                    <Text style={styles.emptyMessage}>No tasks added yet</Text>
                  ) : (
                    <FlatList
                      data={selectedPet.tasks}
                      renderItem={renderTask}
                      keyExtractor={(item) => item.id.toString()}
                      scrollEnabled={false}
                    />
                  )}
                </View>

                {/* Medical Records */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Medical Records ({selectedPet.medicalRecords?.length || 0})</Text>
                  {(!selectedPet.medicalRecords || selectedPet.medicalRecords.length === 0) ? (
                    <Text style={styles.emptyMessage}>No medical records added yet</Text>
                  ) : (
                    <FlatList
                      data={selectedPet.medicalRecords}
                      renderItem={renderMedicalRecord}
                      keyExtractor={(item) => item.id.toString()}
                      scrollEnabled={false}
                    />
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Add Task Modal */}
      <Modal
        visible={showTaskModal}
        animationType="slide"
        onRequestClose={() => setShowTaskModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTaskModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Custom Task</Text>
            <TouchableOpacity onPress={handleAddTask}>
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Task Name *</Text>
              <TextInput
                style={styles.formInput}
                value={customTask.name}
                onChangeText={(text) => setCustomTask(prev => ({ ...prev, name: text }))}
                placeholder="e.g., Walk, Play, Grooming"
                placeholderTextColor={PetHubColors.textTertiary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description *</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={customTask.description}
                onChangeText={(text) => setCustomTask(prev => ({ ...prev, description: text }))}
                placeholder="Describe the task details..."
                placeholderTextColor={PetHubColors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Time *</Text>
              <TouchableOpacity 
                style={styles.formInput}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={[styles.formInputText, !customTask.time && styles.placeholderText]}>
                  {customTask.time || 'Select time'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Frequency</Text>
              <View style={styles.frequencyContainer}>
                {[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'scheduled', label: 'Schedule' }
                ].map((freq) => (
                  <TouchableOpacity
                    key={freq.value}
                    style={[
                      styles.frequencyOption,
                      customTask.frequency === freq.value && styles.frequencyOptionSelected
                    ]}
                    onPress={() => setCustomTask(prev => ({ ...prev, frequency: freq.value }))}
                  >
                    <Text style={[
                      styles.frequencyOptionText,
                      customTask.frequency === freq.value && styles.frequencyOptionTextSelected
                    ]}>
                      {freq.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Day selector for weekly tasks */}
            {customTask.frequency === 'weekly' && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Day of Week *</Text>
                <View style={styles.dayContainer}>
                  {[
                    { value: 'monday', label: 'Mon' },
                    { value: 'tuesday', label: 'Tue' },
                    { value: 'wednesday', label: 'Wed' },
                    { value: 'thursday', label: 'Thu' },
                    { value: 'friday', label: 'Fri' },
                    { value: 'saturday', label: 'Sat' },
                    { value: 'sunday', label: 'Sun' }
                  ].map((day) => (
                    <TouchableOpacity
                      key={day.value}
                      style={[
                        styles.dayOption,
                        customTask.day === day.value && styles.dayOptionSelected
                      ]}
                      onPress={() => setCustomTask(prev => ({ ...prev, day: day.value }))}
                    >
                      <Text style={[
                        styles.dayOptionText,
                        customTask.day === day.value && styles.dayOptionTextSelected
                      ]}>
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Date picker for scheduled tasks */}
            {customTask.frequency === 'scheduled' && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date *</Text>
                <TouchableOpacity 
                  style={styles.formInput}
                  onPress={() => setShowTaskDatePicker(true)}
                >
                  <Text style={[styles.formInputText, !customTask.date && styles.placeholderText]}>
                    {customTask.date ? formatDate(customTask.date) : 'Select date'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <DateTimePickerModal
            isVisible={showTimePicker}
            mode="time"
            onConfirm={handleTimeConfirm}
            onCancel={() => setShowTimePicker(false)}
          />
          
          <DateTimePickerModal
            isVisible={showTaskDatePicker}
            mode="date"
            onConfirm={handleDateConfirm}
            onCancel={() => setShowTaskDatePicker(false)}
            minimumDate={new Date()}
          />
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Medical Record Modal */}
      <Modal
        visible={showMedicalModal}
        animationType="slide"
        onRequestClose={() => setShowMedicalModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMedicalModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Medical Record</Text>
            <TouchableOpacity onPress={handleAddMedicalRecord}>
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Date *</Text>
              <TouchableOpacity 
                style={styles.formInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.formInputText, !medicalRecord.date && styles.placeholderText]}>
                  {medicalRecord.date ? formatDate(medicalRecord.date) : 'Select date'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description *</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={medicalRecord.description}
                onChangeText={(text) => setMedicalRecord(prev => ({ ...prev, description: text }))}
                placeholder="Describe the medical visit or procedure..."
                placeholderTextColor={PetHubColors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Veterinarian Name</Text>
              <TextInput
                style={styles.formInput}
                value={medicalRecord.vetName}
                onChangeText={(text) => setMedicalRecord(prev => ({ ...prev, vetName: text }))}
                placeholder="Dr. Smith"
                placeholderTextColor={PetHubColors.textTertiary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Medication</Text>
              <TextInput
                style={styles.formInput}
                value={medicalRecord.medication}
                onChangeText={(text) => setMedicalRecord(prev => ({ ...prev, medication: text }))}
                placeholder="Any medications prescribed..."
                placeholderTextColor={PetHubColors.textTertiary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Diagnose *</Text>
              <TextInput
                style={styles.formInput}
                value={medicalRecord.diagnose}
                onChangeText={(text) => setMedicalRecord(prev => ({ ...prev, diagnose: text }))}
                placeholder="Medical diagnosis..."
                placeholderTextColor={PetHubColors.textTertiary}
              />
            </View>
          </ScrollView>

          <DateTimePickerModal
            isVisible={showDatePicker}
            mode="date"
            onConfirm={handleMedicalDateConfirm}
            onCancel={() => setShowDatePicker(false)}
            maximumDate={new Date()}
          />
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContent}>
            <Text style={styles.editModalTitle}>Edit Task</Text>
            
            <View style={styles.editFormGroup}>
              <Text style={styles.editFormLabel}>Task Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Task Name"
                value={editTaskName}
                onChangeText={setEditTaskName}
              />
            </View>

            <View style={styles.editFormGroup}>
              <Text style={styles.editFormLabel}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Task Description"
                value={editTaskDescription}
                onChangeText={setEditTaskDescription}
              />
            </View>

            <View style={styles.editFormGroup}>
              <Text style={styles.editFormLabel}>
                {editTaskFrequency === 'daily' ? 'Time *' : 'Date *'}
              </Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => {
                  if (editTaskFrequency === 'daily') {
                    setEditTimePickerVisibility(true);
                  } else {
                    setEditDatePickerVisibility(true);
                  }
                }}
              >
                <Text style={styles.dateText}>
                  {editTaskTime ? (
                    editTaskFrequency === 'daily' 
                      ? new Date(editTaskTime).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })
                      : new Date(editTaskTime).toLocaleDateString()
                  ) : (
                    editTaskFrequency === 'daily' ? 'Select Time' : 'Select Date'
                  )}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.editFormGroup}>
              <Text style={styles.editFormLabel}>Frequency</Text>
              <View style={styles.editFrequencyContainer}>
                {['daily', 'weekly', 'scheduled'].map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.editFrequencyOption,
                      editTaskFrequency === freq && styles.editFrequencyOptionSelected
                    ]}
                    onPress={() => setEditTaskFrequency(freq)}
                  >
                    <Text style={[
                      styles.editFrequencyOptionText,
                      editTaskFrequency === freq && styles.editFrequencyOptionTextSelected
                    ]}>
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <DateTimePickerModal
              isVisible={isEditTimePickerVisible}
              mode="time"
              onConfirm={handleEditTimeConfirm}
              onCancel={() => setEditTimePickerVisibility(false)}
            />

            <DateTimePickerModal
              isVisible={isEditDatePickerVisible}
              mode="date"
              onConfirm={handleEditDateConfirm}
              onCancel={() => setEditDatePickerVisibility(false)}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveEditedTask}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Medical Record Modal */}
      <Modal
        visible={isEditMedicalModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelMedicalEdit}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContent}>
            <Text style={styles.editModalTitle}>Edit Medical Record</Text>
            
            <View style={styles.editFormGroup}>
              <Text style={styles.editFormLabel}>Date *</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setEditMedicalDatePickerVisibility(true)}
              >
                <Text style={styles.dateText}>
                  {editMedicalDate ? new Date(editMedicalDate).toLocaleDateString() : 'Select Date'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.editFormGroup}>
              <Text style={styles.editFormLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textAreaInput]}
                placeholder="Describe the medical visit or procedure..."
                value={editMedicalDescription}
                onChangeText={setEditMedicalDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.editFormGroup}>
              <Text style={styles.editFormLabel}>Veterinarian Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Dr. Smith"
                value={editMedicalVetName}
                onChangeText={setEditMedicalVetName}
              />
            </View>

            <View style={styles.editFormGroup}>
              <Text style={styles.editFormLabel}>Medication *</Text>
              <TextInput
                style={styles.input}
                placeholder="Any medications prescribed..."
                value={editMedicalMedication}
                onChangeText={setEditMedicalMedication}
              />
            </View>

            <View style={styles.editFormGroup}>
              <Text style={styles.editFormLabel}>Diagnose *</Text>
              <TextInput
                style={styles.input}
                placeholder="Medical diagnosis..."
                value={editMedicalDiagnose}
                onChangeText={setEditMedicalDiagnose}
              />
            </View>
            
            <DateTimePickerModal
              isVisible={isEditMedicalDatePickerVisible}
              mode="date"
              onConfirm={handleEditMedicalDateConfirm}
              onCancel={() => setEditMedicalDatePickerVisibility(false)}
              maximumDate={new Date()}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelMedicalEdit}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveEditedMedicalRecord}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: PetHubColors.white,
  },
  header: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 24,
    backgroundColor: PetHubColors.white,
    borderBottomWidth: 1,
    borderBottomColor: PetHubColors.lightGray,
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: PetHubColors.darkGray,
    letterSpacing: 0.5,
  },
  addPetButton: {
    backgroundColor: PetHubColors.darkGray,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addPetButtonText: {
    color: PetHubColors.white,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0,
    textAlign: 'center',
    lineHeight: 11,
    includeFontPadding: false,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: PetHubColors.textSecondary,
    fontWeight: '500',
    marginTop: 12,
  },
  petsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: PetHubColors.darkGray,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  emptySubtext: {
    fontSize: 15,
    color: PetHubColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
  },
  petCard: {
    backgroundColor: PetHubColors.white,
    borderRadius: 20,
    padding: 24,
    marginVertical: 12,
    marginHorizontal: 4,
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: PetHubColors.lightGray,
  },
  petHeader: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: PetHubColors.lightGray,
  },
  petImage: { 
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: PetHubColors.lightGray,
    marginRight: 16,
    borderWidth: 3,
    borderColor: PetHubColors.white,
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 22,
    fontWeight: '700',
    color: PetHubColors.darkGray,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  petDetails: {
    fontSize: 15,
    color: PetHubColors.textSecondary,
    marginBottom: 4,
    fontWeight: '500', 
  },
  petAge: {
    fontSize: 14,
    color: PetHubColors.textTertiary,
    fontWeight: '400',
  },
  petStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: PetHubColors.lightGray,
    borderRadius: 16,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: PetHubColors.darkGray,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: PetHubColors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  petActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    paddingHorizontal: 4,
  },
  actionButton: {
    backgroundColor: PetHubColors.darkGray,
    paddingHorizontal: 10,
    paddingVertical: 14,
    borderRadius: 18,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: PetHubColors.white,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.1,
    textAlign: 'center',
    lineHeight: 12,
    includeFontPadding: false,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: PetHubColors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: PetHubColors.lightGray,
    backgroundColor: PetHubColors.white,
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  modalCloseText: {
    fontSize: 14,
    color: PetHubColors.textSecondary,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PetHubColors.darkGray,
    letterSpacing: 0.3,
    textAlign: 'center',
    flex: 1,
  },
  modalSaveText: {
    fontSize: 14,
    color: PetHubColors.darkGray,
    fontWeight: '600',
    letterSpacing: 0.3,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  placeholder: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  detailSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: PetHubColors.darkGray,
    width: 80,
  },
  detailValue: {
    fontSize: 16,
    color: PetHubColors.textSecondary,
    flex: 1,
  },
  taskItem: {
    backgroundColor: PetHubColors.lightGray,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  taskInfo: {
    flex: 1,
  },
  taskType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: PetHubColors.textSecondary,
    marginBottom: 4,
  },
  taskTime: {
    fontSize: 12,
    color: PetHubColors.textTertiary,
  },
  medicalItem: {
    backgroundColor: PetHubColors.lightGray,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  medicalInfo: {
    flex: 1,
  },
  medicalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
    marginBottom: 4,
  },
  medicalDate: {
    fontSize: 14,
    color: PetHubColors.textSecondary,
    marginBottom: 2,
  },
  medicalVet: {
    fontSize: 12,
    color: PetHubColors.textSecondary,
    marginTop: 4,
  },
  medicalMedication: {
    fontSize: 12,
    color: PetHubColors.textSecondary,
    marginTop: 4,
  },
  medicalDescription: {
    fontSize: 12,
    color: PetHubColors.textTertiary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyMessage: {
    fontSize: 14,
    color: PetHubColors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: PetHubColors.darkGray,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  formInput: {
    backgroundColor: PetHubColors.lightGray,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: PetHubColors.darkGray,
    minHeight: 56,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  formTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  formInputText: {
    fontSize: 16,
    color: PetHubColors.darkGray,
  },
  placeholderText: {
    color: PetHubColors.textTertiary,
  },
  frequencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  frequencyOption: {
    backgroundColor: PetHubColors.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    flex: 1,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  frequencyOptionSelected: {
    backgroundColor: PetHubColors.darkGray,
    borderColor: PetHubColors.darkGray,
  },
  frequencyOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: PetHubColors.darkGray,
    letterSpacing: 0.3,
  },
  frequencyOptionTextSelected: {
    color: PetHubColors.white,
  },
  dayContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayOption: {
    backgroundColor: PetHubColors.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 40,
    alignItems: 'center',
  },
  dayOptionSelected: {
    backgroundColor: PetHubColors.darkGray,
    borderColor: PetHubColors.darkGray,
  },
  dayOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: PetHubColors.darkGray,
  },
  dayOptionTextSelected: {
    color: PetHubColors.white,
  },
  // Task action styles
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  editTaskButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  editTaskButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteTaskButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  deleteTaskButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Medical record action styles
  medicalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  editMedicalButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  editMedicalButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteMedicalButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  deleteMedicalButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Edit modal styles
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
    color: '#222',
  },
  textAreaInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: { 
    color: '#333', 
    fontSize: 16 
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  // Form styles for edit modal
  editFormGroup: {
    marginBottom: 16,
  },
  editFormLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  editFrequencyContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  editFrequencyOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  editFrequencyOptionSelected: {
    backgroundColor: '#007bff',
  },
  editFrequencyOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  editFrequencyOptionTextSelected: {
    color: '#fff',
  },
});

export default PetsScreen;