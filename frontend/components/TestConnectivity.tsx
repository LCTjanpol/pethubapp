import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { apiClient } from '../config/api';
import { PetHubColors } from '../constants/Colors';

interface ConnectivityTestProps {
  onTestComplete?: (success: boolean) => void;
}

const TestConnectivity: React.FC<ConnectivityTestProps> = ({ onTestComplete }) => {
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const testBackendConnection = async () => {
    setTesting(true);
    setLastResult(null);

    try {
      console.log('Testing backend connectivity...');
      
      // Test health endpoint
      const response = await apiClient.get('/health');
      
      if (response.data.status === 'healthy') {
        setLastResult('✅ Backend Connected Successfully');
        Alert.alert('Success', 'Backend connection is working!');
        onTestComplete?.(true);
      } else {
        setLastResult('⚠️ Backend Responded but Status Unknown');
        Alert.alert('Warning', 'Backend responded but status is unclear');
        onTestComplete?.(false);
      }
    } catch (error: any) {
      console.error('Backend connectivity test failed:', error);
      
      let errorMessage = 'Connection failed';
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Backend server is not running';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Cannot resolve backend address';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Connection timeout';
      }
      
      setLastResult(`❌ ${errorMessage}`);
      Alert.alert('Connection Failed', errorMessage);
      onTestComplete?.(false);
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Backend Connectivity Test</Text>
      
      <TouchableOpacity 
        style={[styles.testButton, testing && styles.disabledButton]}
        onPress={testBackendConnection}
        disabled={testing}
      >
        <Text style={styles.testButtonText}>
          {testing ? 'Testing...' : 'Test Connection'}
        </Text>
      </TouchableOpacity>

      {lastResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{lastResult}</Text>
        </View>
      )}

      <Text style={styles.infoText}>
        This tests the connection to: http://10.40.0.230:3000/api
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: PetHubColors.white,
    padding: 20,
    margin: 20,
    borderRadius: 12,
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
    marginBottom: 15,
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: PetHubColors.darkGray,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
  testButtonText: {
    color: PetHubColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: PetHubColors.lightGray,
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  resultText: {
    fontSize: 14,
    color: PetHubColors.darkGray,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 12,
    color: PetHubColors.textSecondary,
    textAlign: 'center',
  },
});

export default TestConnectivity; 
