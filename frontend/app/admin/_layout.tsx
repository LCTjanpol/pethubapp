import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="shops" />
      <Stack.Screen name="users" />
      <Stack.Screen name="pets" />
      <Stack.Screen name="posts" />
    </Stack>
  );
}
