import { Stack } from 'expo-router';

export default function EditAndAddLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="addpet" />
      <Stack.Screen name="addtask" />
      <Stack.Screen name="addvaccine" />
      <Stack.Screen name="editpetprofile" />
      <Stack.Screen name="editprofile" />
    </Stack>
  );
}
