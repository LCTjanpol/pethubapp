import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { PetHubColors } from '../../constants/Colors';
import { useRouter } from 'expo-router';

export default function TabLayout() {
  const router = useRouter();
  
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PetHubColors.darkGray,
        tabBarInactiveTintColor: PetHubColors.textSecondary,
        tabBarStyle: {
          backgroundColor: PetHubColors.white,
          borderTopColor: PetHubColors.mediumGray,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        // Add lazy loading to prevent navigation issues
        lazy: true,
        // Ensure tabs maintain their state
        unmountOnBlur: false,
      }}
      screenListeners={{
        tabPress: (e) => {
          console.log('Tab pressed:', e.target);
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <FontAwesome name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pets"
        options={{
          title: 'Pets',
          tabBarIcon: ({ color }) => <FontAwesome name="paw" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="maps"
        options={{
          title: 'Maps',
          tabBarIcon: ({ color }) => <FontAwesome name="map-marker" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color }) => <FontAwesome name="bell" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <FontAwesome name="user" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}