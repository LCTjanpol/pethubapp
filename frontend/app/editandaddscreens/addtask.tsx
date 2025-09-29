import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, FlatList, Image, Modal } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { apiClient, ENDPOINTS } from '../../config/api';

// Types for daily tasks and scheduled tasks
interface DailyTask {
  time: string;
  id: number | null;
  type: string;
}
interface ScheduledTask {
  id: number;
  description: string;
  time: string;
  petId: number;
  type: string;
}

const AddTaskScreen = () => {
  const route = useRoute();
  const { petId } = route.params as { petId: number };

  // State for daily tasks (Feeding, Pooping, Drinking)
  const [dailyTasks, setDailyTasks] = useState<Record<string, DailyTask>>({
    Feeding: { time: '', id: null, type: 'Feeding' },
    Pooping: { time: '', id: null, type: 'Pooping' },
    Drinking: { time: '', id: null, type: 'Drinking' },
  });
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);
  const [currentTask, setCurrentTask] = useState('');

  // State for scheduled tasks
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [newScheduledTask, setNewScheduledTask] = useState({ taskName: '', date: '' });
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  
  // State for weekly task days selection
  const [selectedDays, setSelectedDays] = useState({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });
  const [taskFrequency, setTaskFrequency] = useState('daily');

  // State for edit functionality
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [editingDailyTask, setEditingDailyTask] = useState<{taskName: string, task: DailyTask} | null>(null);
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskDate, setEditTaskDate] = useState('');
  const [editTaskTime, setEditTaskTime] = useState('');
  const [editTaskFrequency, setEditTaskFrequency] = useState('daily');
  const [editSelectedDays, setEditSelectedDays] = useState({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });
  const [isEditDatePickerVisible, setEditDatePickerVisibility] = useState(false);
  const [isEditTimePickerVisible, setEditTimePickerVisibility] = useState(false);
  const [isEditModalVisible, setEditModalVisibility] = useState(false);
  const [isEditDailyModalVisible, setEditDailyModalVisibility] = useState(false);

  // Days of the week
  const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  const fetchTasks = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await apiClient.get(`${ENDPOINTS.TASK.LIST}?petId=${petId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tasks = response.data;
      const updatedDailyTasks: Record<string, DailyTask> = {
        Feeding: { time: '', id: null, type: 'Feeding' },
        Pooping: { time: '', id: null, type: 'Pooping' },
        Drinking: { time: '', id: null, type: 'Drinking' },
      };
      const scheduled: ScheduledTask[] = [];
      tasks.forEach((task: any) => {
        if (['Feeding', 'Pooping', 'Drinking'].includes(task.type) && updatedDailyTasks[task.type]) {
          updatedDailyTasks[task.type] = { time: task.time, id: task.id, type: task.type };
        } else if (task.type === 'Minor') {
          scheduled.push({
            id: task.id,
            description: task.description,
            time: task.time,
            petId: task.petId,
            type: task.type,
          });
        }
      });
      setDailyTasks(updatedDailyTasks);
      setScheduledTasks(scheduled);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        await AsyncStorage.removeItem('token');
        Alert.alert('Session expired', 'Please log in again.', [
          { text: 'OK', onPress: () => { router.replace('/auth/login'); } }
        ]);
      } else {
        Alert.alert('Error', 'Failed to fetch tasks: ' + (error?.message || 'Unknown error'));
      }
    }
  }, [petId]);

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  // Handle time selection for daily tasks
  const handleConfirmTime = (time: Date) => {
    // Format as HH:MM AM/PM
    const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    setDailyTasks(prev => {
      const updated = { ...prev };
      updated[currentTask] = { ...updated[currentTask], time: formattedTime };
      return updated;
    });
    setTimePickerVisibility(false);
    saveDailyTask(currentTask, formattedTime);
  };

  const validateScheduleTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      Alert.alert('Invalid Time', 'Please enter a valid time between 00:00 and 23:59');
      return false;
    }
    return true;
  };

  const saveDailyTask = async (taskName: string, time: string) => {
    if (!validateScheduleTime(time)) {
      return;
    }
    
    try {
      const token = await AsyncStorage.getItem('token');
      const now = new Date();
      const [hour, minute] = time.split(':');
      const isoTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hour), parseInt(minute)).toISOString();
      const taskData = { type: taskName, time: isoTime, petId, description: 'Crucial', frequency: 'daily' };
      
      if (dailyTasks[taskName].id) {
        await apiClient.put(ENDPOINTS.TASK.UPDATE(dailyTasks[taskName].id!.toString()), taskData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDailyTasks((prev) => ({
          ...prev,
          [taskName]: { ...prev[taskName], time, type: taskName },
        }));
        Alert.alert('Success', `${taskName} time updated!`);
      } else {
        const response = await apiClient.post(ENDPOINTS.TASK.LIST, taskData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDailyTasks((prev) => ({
          ...prev,
          [taskName]: { time, id: response.data.id, type: taskName },
        }));
        Alert.alert('Success', `${taskName} time set!`);
      }
    } catch (error: any) {
      if (error?.response?.status === 200) {
        // Task was updated instead of created (this is normal for daily tasks)
        Alert.alert('Success', `${taskName} time updated!`);
        // Refresh the tasks to get the updated data
        await fetchTasks();
      } else {
        Alert.alert('Error', `Failed to save ${taskName} task: ` + (error?.message || 'Unknown error'));
      }
    }
  };

  const showTimePicker = (task: string) => {
    setCurrentTask(task);
    setTimePickerVisibility(true);
  };

  // Handle date selection for scheduled tasks
  const handleConfirmDate = (date: Date) => {
    const formattedDate = date.toISOString().split('T')[0];
    setNewScheduledTask({ ...newScheduledTask, date: formattedDate });
    setDatePickerVisibility(false);
  };

  const clearFormData = () => {
    setNewScheduledTask({ taskName: '', date: '' });
    setSelectedDays({
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    });
    setTaskFrequency('daily');
  };

  // Helper function to toggle day selection
  const toggleDaySelection = (day: keyof typeof selectedDays) => {
    console.log('🔄 Toggling day:', day);
    setSelectedDays(prev => {
      const newDays = {
        ...prev,
        [day]: !prev[day]
      };
      
      console.log('📅 New days state:', newDays);
      
      // Check if all days are selected
      const allSelected = Object.values(newDays).every(selected => selected);
      if (allSelected) {
        console.log('✅ All days selected, setting to daily');
        setTaskFrequency('daily');
      }
      
      return newDays;
    });
  };

  // Helper function to toggle edit day selection
  const toggleEditDaySelection = (day: keyof typeof editSelectedDays) => {
    setEditSelectedDays(prev => {
      const newDays = {
        ...prev,
        [day]: !prev[day]
      };
      
      // Check if all days are selected
      const allSelected = Object.values(newDays).every(selected => selected);
      if (allSelected) {
        setEditTaskFrequency('daily');
      }
      
      return newDays;
    });
  };

  // Helper function to get frequency based on selected days
  const getFrequencyFromDays = (days: typeof selectedDays) => {
    const selectedCount = Object.values(days).filter(selected => selected).length;
    return selectedCount === 7 ? 'daily' : 'weekly';
  };

  // Helper function to get days string for display
  const getDaysString = (days: typeof selectedDays) => {
    const selectedDaysList = Object.entries(days)
      .filter(([_, selected]) => selected)
      .map(([day, _]) => day);
    
    if (selectedDaysList.length === 0) return 'No days selected';
    if (selectedDaysList.length === 7) return 'Daily';
    if (selectedDaysList.length === 1) {
      const dayName = daysOfWeek.find(d => d.key === selectedDaysList[0])?.label || selectedDaysList[0];
      return dayName;
    }
    if (selectedDaysList.length === 2) {
      const dayLabels = selectedDaysList.map(day => 
        daysOfWeek.find(d => d.key === day)?.label || day
      );
      return dayLabels.join(', ');
    }
    return `${selectedDaysList.length} days selected`;
  };

  const handleAddScheduledTask = async () => {
    if (!newScheduledTask.taskName) {
      Alert.alert('Error', 'Task name is required');
      return;
    }
    
    // For weekly tasks, check if days are selected
    const selectedCount = Object.values(selectedDays).filter(selected => selected).length;
    if (taskFrequency === 'weekly' && selectedCount === 0) {
      Alert.alert('Error', 'Please select at least one day for weekly tasks');
      return;
    }
    
    // For scheduled tasks, check if date is provided
    if (taskFrequency === 'scheduled' && !newScheduledTask.date) {
      Alert.alert('Error', 'Date is required for scheduled tasks');
      return;
    }
    
    try {
      const token = await AsyncStorage.getItem('token');
      const frequency = getFrequencyFromDays(selectedDays);
      const selectedDaysList = Object.entries(selectedDays)
        .filter(([_, selected]) => selected)
        .map(([day, _]) => day);
      
      const taskData = {
        type: 'Minor',
        description: newScheduledTask.taskName,
        time: taskFrequency === 'scheduled' ? new Date(newScheduledTask.date).toISOString() : new Date().toISOString(),
        petId,
        frequency: frequency,
        selectedDays: frequency === 'weekly' ? selectedDaysList.join(',') : null,
      };
      
      const response = await apiClient.post(ENDPOINTS.TASK.LIST, taskData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setScheduledTasks([...scheduledTasks, {
        id: response.data.id,
        description: response.data.description,
        time: response.data.time,
        petId: response.data.petId,
        type: response.data.type,
      }]);
      
      clearFormData();
      Alert.alert('Success', 'Task added successfully!');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to add task: ' + (error?.message || 'Unknown error'));
    }
  };

  // Delete daily task
  const handleDeleteDailyTask = async (taskName: string) => {
    const task = dailyTasks[taskName];
    if (!task.id) {
      Alert.alert('Error', 'No task to delete');
      return;
    }

    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete the ${taskName} task?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await apiClient.delete(ENDPOINTS.TASK.DELETE(task.id!.toString()), {
                headers: { Authorization: `Bearer ${token}` },
              });
              setDailyTasks((prev) => ({
                ...prev,
                [taskName]: { time: '', id: null, type: taskName },
              }));
              Alert.alert('Success', `${taskName} task deleted!`);
            } catch (error: any) {
              Alert.alert('Error', `Failed to delete ${taskName} task: ` + (error?.message || 'Unknown error'));
            }
          },
        },
      ]
    );
  };

  // Edit daily task functionality
  const handleEditDailyTask = (taskName: string, task: DailyTask) => {
    setEditingDailyTask({ taskName, task });
    setEditTaskName(taskName);
    setEditTaskDescription(task.type === 'Feeding' || task.type === 'Drinking' || task.type === 'Pooping' ? 'Crucial' : '');
    setEditTaskTime(task.time);
    setEditTaskFrequency('daily');
    setEditDailyModalVisibility(true);
  };

  // Edit scheduled task functionality
  const handleEditScheduledTask = (task: ScheduledTask) => {
    setEditingTask(task);
    setEditTaskName(task.description);
    setEditTaskDescription(task.description);
    setEditTaskDate(new Date(task.time).toISOString().split('T')[0]);
    setEditTaskFrequency('scheduled');
    setEditSelectedDays({
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    });
    setEditModalVisibility(true);
  };

  // Handle edit date selection
  const handleEditDateConfirm = (date: Date) => {
    const formattedDate = date.toISOString().split('T')[0];
    setEditTaskDate(formattedDate);
    setEditDatePickerVisibility(false);
  };

  // Handle edit time selection
  const handleEditTimeConfirm = (time: Date) => {
    const formattedTime = time.toISOString();
    setEditTaskTime(formattedTime);
    setEditTimePickerVisibility(false);
  };

  // Save edited daily task
  const handleSaveEditedDailyTask = async () => {
    if (!editingDailyTask || !editTaskName || !editTaskTime) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const taskData = {
        type: editTaskName,
        description: editTaskDescription,
        time: editTaskTime,
        petId,
        frequency: editTaskFrequency,
      };

      await apiClient.put(ENDPOINTS.TASK.UPDATE(editingDailyTask.task.id!.toString()), taskData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update the task in the daily tasks
      setDailyTasks((prev) => ({
        ...prev,
        [editTaskName]: { 
          time: editTaskTime, 
          id: editingDailyTask.task.id, 
          type: editTaskName 
        },
      }));

      // Close modal and reset state
      setEditDailyModalVisibility(false);
      setEditingDailyTask(null);
      setEditTaskName('');
      setEditTaskDescription('');
      setEditTaskTime('');
      Alert.alert('Success', 'Daily task updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update daily task: ' + (error?.message || 'Unknown error'));
    }
  };

  // Save edited scheduled task
  const handleSaveEditedTask = async () => {
    if (!editingTask || !editTaskName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // For weekly tasks, check if days are selected
    const editSelectedCount = Object.values(editSelectedDays).filter(selected => selected).length;
    if (editTaskFrequency === 'weekly' && editSelectedCount === 0) {
      Alert.alert('Error', 'Please select at least one day for weekly tasks');
      return;
    }

    // For scheduled tasks, check if date is provided
    if (editTaskFrequency === 'scheduled' && !editTaskDate) {
      Alert.alert('Error', 'Date is required for scheduled tasks');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const frequency = getFrequencyFromDays(editSelectedDays);
      const editSelectedDaysList = Object.entries(editSelectedDays)
        .filter(([_, selected]) => selected)
        .map(([day, _]) => day);
      
      const taskData = {
        type: 'Minor',
        description: editTaskName,
        time: editTaskFrequency === 'scheduled' ? new Date(editTaskDate).toISOString() : new Date().toISOString(),
        petId,
        frequency: frequency,
        selectedDays: frequency === 'weekly' ? editSelectedDaysList.join(',') : null,
      };

      await apiClient.put(ENDPOINTS.TASK.UPDATE(editingTask.id.toString()), taskData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update the task in the list
      setScheduledTasks((prev) => 
        prev.map((task) => 
          task.id === editingTask.id 
            ? { ...task, description: editTaskName, time: taskData.time }
            : task
        )
      );

      // Close modal and reset state
      setEditModalVisibility(false);
      setEditingTask(null);
      setEditTaskName('');
      setEditTaskDescription('');
      setEditTaskDate('');
      setEditSelectedDays({
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      });
      setEditTaskFrequency('daily');
      Alert.alert('Success', 'Task updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update task: ' + (error?.message || 'Unknown error'));
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditModalVisibility(false);
    setEditDailyModalVisibility(false);
    setEditingTask(null);
    setEditingDailyTask(null);
    setEditTaskName('');
    setEditTaskDescription('');
    setEditTaskDate('');
    setEditTaskTime('');
    setEditSelectedDays({
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    });
    setSelectedDays({
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    });
    setEditTaskFrequency('daily');
    setTaskFrequency('daily');
  };

  const handleDeleteScheduledTask = async (taskId: number) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this scheduled task?',
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
              setScheduledTasks((prev) => prev.filter((task) => task.id !== taskId));
              Alert.alert('Success', 'Scheduled task deleted!');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete scheduled task: ' + (error?.message || 'Unknown error'));
            }
          },
        },
      ]
    );
  };

  const renderScheduledTask = ({ item }: { item: ScheduledTask }) => (
    <View style={styles.scheduledTaskBox}>
      <Text style={styles.scheduledTaskDescription}>{item.description}</Text>
      <View style={styles.scheduledTaskRow}>
        <Text style={styles.scheduledTaskDate}>{item.time ? new Date(item.time).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</Text>
        <View style={styles.scheduledTaskButtons}>
          <TouchableOpacity
            style={styles.scheduledEditButton}
            onPress={() => handleEditScheduledTask(item)}
          >
            <Text style={styles.scheduledEditButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.scheduledDeleteButton}
            onPress={() => handleDeleteScheduledTask(item.id)}
          >
            <Text style={styles.scheduledDeleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>Add Task</Text>

      {/* Daily Tasks Section */}
      <Text style={styles.sectionHeader}>Daily Tasks</Text>
      {['Feeding', 'Drinking', 'Pooping'].map((task) => (
        <View key={task} style={styles.dailyTaskContainer}>
          <Text style={styles.taskLabel}>{task}</Text>
          <View style={styles.dailyTaskRow}>
            <TouchableOpacity onPress={() => showTimePicker(task)}>
              <Image source={require('../../assets/images/clock.png')} style={styles.icon} />
            </TouchableOpacity>
            <View style={styles.timeBox}>
              <Text style={styles.timeBoxText}>
                {dailyTasks[task] && dailyTasks[task].time
                  ? (() => {
                      // If already formatted, show as is; if ISO, format to hh:mm am/pm
                      const t = dailyTasks[task].time;
                      if (/\d{1,2}:\d{2}\s?(AM|PM|am|pm)/.test(t)) return t;
                      const d = new Date(t);
                      if (!isNaN(d.getTime())) {
                        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
                      }
                      return t;
                    })()
                  : 'Set Time'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => showTimePicker(task)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
              <Image source={require('../../assets/images/edit.png')} style={styles.editIcon} />
            </TouchableOpacity>
            {dailyTasks[task] && dailyTasks[task].id && (
              <>
                <TouchableOpacity
                  style={styles.editTimeButton}
                  onPress={() => handleEditDailyTask(task, dailyTasks[task])}
                >
                  <Text style={styles.editTimeButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteDailyTask(task)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      ))}
      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        onConfirm={handleConfirmTime}
        onCancel={() => setTimePickerVisibility(false)}
      />

      {/* Scheduled Tasks Section */}
      <Text style={styles.sectionHeader}>Add New Task</Text>
      <TextInput
        style={styles.input}
        placeholder="Task Name"
        value={newScheduledTask.taskName}
        onChangeText={(text) => setNewScheduledTask({ ...newScheduledTask, taskName: text })}
      />
      
      {/* Frequency Selection */}
      <View style={styles.frequencyContainer}>
        {['daily', 'weekly', 'scheduled'].map((freq) => (
          <TouchableOpacity
            key={freq}
            style={[
              styles.frequencyOption,
              taskFrequency === freq && styles.frequencyOptionSelected
            ]}
            onPress={() => setTaskFrequency(freq)}
          >
            <Text style={[
              styles.frequencyOptionText,
              taskFrequency === freq && styles.frequencyOptionTextSelected
            ]}>
              {freq.charAt(0).toUpperCase() + freq.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date Selection for Scheduled Tasks */}
      {taskFrequency === 'scheduled' && (
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => setDatePickerVisibility(true)}
        >
          <Text style={styles.dateText}>
            {newScheduledTask.date || 'Select Date (YYYY-MM-DD)'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Day Selection for Weekly Tasks */}
      {taskFrequency === 'weekly' && (
        <View style={styles.daySelectionContainer}>
          <Text style={styles.daySelectionLabel}>Select Days:</Text>
          <Text style={styles.debugText}>Debug: {JSON.stringify(selectedDays)}</Text>
          <View style={styles.daysGrid}>
            {Object.entries(selectedDays).map(([day, selected]) => {
              console.log('🎯 Rendering day:', day, 'selected:', selected);
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayOption,
                    selected && styles.dayOptionSelected
                  ]}
                  onPress={() => {
                    console.log('👆 Pressed day:', day);
                    toggleDaySelection(day as keyof typeof selectedDays);
                  }}
                >
                  <Text style={[
                    styles.dayOptionText,
                    selected && styles.dayOptionTextSelected
                  ]}>
                    {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.selectedDaysText}>
            {getDaysString(selectedDays)}
          </Text>
        </View>
      )}

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={() => setDatePickerVisibility(false)}
      />
      
      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleAddScheduledTask}
      >
        <Text style={styles.submitButtonText}>Add Task</Text>
      </TouchableOpacity>

      {/* List of Scheduled Tasks */}
      <FlatList
        data={scheduledTasks}
        renderItem={renderScheduledTask}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.taskList}
      />

      {/* Edit Task Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Scheduled Task</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Task Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Task Name"
                value={editTaskName}
                onChangeText={setEditTaskName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Task Description"
                value={editTaskDescription}
                onChangeText={setEditTaskDescription}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Date *</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setEditDatePickerVisibility(true)}
              >
                <Text style={styles.dateText}>
                  {editTaskDate || 'Select Date (YYYY-MM-DD)'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Frequency</Text>
              <View style={styles.frequencyContainer}>
                {['daily', 'weekly', 'scheduled'].map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyOption,
                      editTaskFrequency === freq && styles.frequencyOptionSelected
                    ]}
                    onPress={() => setEditTaskFrequency(freq)}
                  >
                    <Text style={[
                      styles.frequencyOptionText,
                      editTaskFrequency === freq && styles.frequencyOptionTextSelected
                    ]}>
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Day Selection for Weekly Tasks */}
            {editTaskFrequency === 'weekly' && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Select Days</Text>
                <View style={styles.daysGrid}>
                  {Object.entries(editSelectedDays).map(([day, selected]) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayOption,
                        selected && styles.dayOptionSelected
                      ]}
                      onPress={() => toggleEditDaySelection(day as keyof typeof editSelectedDays)}
                    >
                      <Text style={[
                        styles.dayOptionText,
                        selected && styles.dayOptionTextSelected
                      ]}>
                        {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.selectedDaysText}>
                  {getDaysString(editSelectedDays)}
                </Text>
              </View>
            )}
            
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

      {/* Edit Daily Task Modal */}
      <Modal
        visible={isEditDailyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Daily Task</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Task Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Task Name"
                value={editTaskName}
                onChangeText={setEditTaskName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Task Description"
                value={editTaskDescription}
                onChangeText={setEditTaskDescription}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Time *</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setEditTimePickerVisibility(true)}
              >
                <Text style={styles.dateText}>
                  {editTaskTime ? new Date(editTaskTime).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }) : 'Select Time'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Frequency</Text>
              <View style={styles.frequencyContainer}>
                {['daily', 'weekly'].map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyOption,
                      editTaskFrequency === freq && styles.frequencyOptionSelected
                    ]}
                    onPress={() => setEditTaskFrequency(freq)}
                  >
                    <Text style={[
                      styles.frequencyOptionText,
                      editTaskFrequency === freq && styles.frequencyOptionTextSelected
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
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveEditedDailyTask}
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
  padding: 10, 
  backgroundColor: '#fff' 
},
  headerText: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#000', 
    marginBottom: 10, 
    marginTop: 20 
},
  sectionHeader: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#000', 
    marginTop: 10, 
    marginBottom: 5 
},
  dailyTaskContainer: {
    marginBottom: 18,
  },
  dailyTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
    marginTop: 0,
  },
  taskLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
    marginLeft: 2,
  },
  icon: {
    width: 28,
    height: 28,
    marginRight: 10,
    tintColor: '#222',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: '#ededed',
    borderRadius: 12,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  editButtonText: {
    color: '#222',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 6,
  },
  editIcon: { 
    width: 22, 
    height: 22, 
    tintColor: '#222' 
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  editTimeButton: {
    backgroundColor: '#007bff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  editTimeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeBox: {
    flex: 1,
    backgroundColor: '#d6d6d6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  timeBoxText: {
    color: '#222',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  input: {
    borderWidth: 0,
    backgroundColor: '#d6d6d6',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
    color: '#222',
  },
  dateInput: {
    borderWidth: 0,
    backgroundColor: '#d6d6d6',
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
  submitButton: {
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 4,
  },
  submitButtonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 18 
},
  taskList: { 
    paddingBottom: 10 
},
  scheduledTaskBox: {
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
    marginBottom: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scheduledTaskDescription: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
  },
  scheduledTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduledTaskButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduledTaskDate: {
    fontSize: 15,
    color: '#333',
  },
  scheduledEditButton: {
    backgroundColor: '#007bff',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  scheduledEditButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scheduledDeleteButton: {
    backgroundColor: '#dc3545',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  scheduledDeleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
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
  // Form styles
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  frequencyOptionSelected: {
    backgroundColor: '#007bff',
  },
  frequencyOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  frequencyOptionTextSelected: {
    color: '#fff',
  },
  // Day selection styles
  daySelectionContainer: {
    marginBottom: 16,
  },
  daySelectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  dayOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    minWidth: 40,
    alignItems: 'center',
  },
  dayOptionSelected: {
    backgroundColor: '#007bff',
  },
  dayOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  dayOptionTextSelected: {
    color: '#fff',
  },
  selectedDaysText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  debugText: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 8,
  },
});

export default AddTaskScreen;