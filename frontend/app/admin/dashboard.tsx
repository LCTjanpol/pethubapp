import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, RefreshControl, 
  ActivityIndicator, Dimensions, TouchableOpacity
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { apiClient, ENDPOINTS } from '../../config/api';
import { PetHubColors } from '../../constants/Colors';

const screenWidth = Dimensions.get('window').width;

interface DashboardStats {
  totalUsers: number;
  totalPets: number;
  totalPosts: number;
  totalShops: number;
  recentUsers: number;
  recentPets: number;
  recentPosts: number;
  recentShops: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPets: 0,
    totalPosts: 0,
    totalShops: 0,
    recentUsers: 0,
    recentPets: 0,
    recentPosts: 0,
    recentShops: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard statistics
  const fetchDashboardStats = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/auth/login');
        return;
      }

      const [usersRes, petsRes, postsRes, shopsRes] = await Promise.all([
        apiClient.get(ENDPOINTS.ADMIN.USERS, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(ENDPOINTS.ADMIN.PETS, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(ENDPOINTS.POST.LIST, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(ENDPOINTS.SHOP.LIST, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const totalUsers = usersRes.data?.length || 0;
      const totalPets = petsRes.data?.length || 0;
      const totalPosts = postsRes.data?.length || 0;
      const totalShops = shopsRes.data?.length || 0;

      // Calculate recent items (last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const recentUsers = usersRes.data?.filter((user: any) => 
        user.createdAt && new Date(user.createdAt) > oneWeekAgo
      ).length || 0;

      const recentPets = petsRes.data?.filter((pet: any) => 
        pet.createdAt && new Date(pet.createdAt) > oneWeekAgo
      ).length || 0;

      const recentPosts = postsRes.data?.filter((post: any) => 
        post.createdAt && new Date(post.createdAt) > oneWeekAgo
      ).length || 0;

      const recentShops = shopsRes.data?.filter((shop: any) => 
        shop.createdAt && new Date(shop.createdAt) > oneWeekAgo
      ).length || 0;

      setStats({
        totalUsers,
        totalPets,
        totalPosts,
        totalShops,
        recentUsers,
        recentPets,
        recentPosts,
        recentShops,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Navigation handlers
  const navigateToUsers = () => {
    console.log('Navigating to users...');
    try {
      router.replace('/admin/users');
    } catch (error) {
      console.error('Navigation error to users:', error);
    }
  };
  const navigateToPets = () => {
    console.log('Navigating to pets...');
    try {
      router.replace('/admin/pets');
    } catch (error) {
      console.error('Navigation error to pets:', error);
    }
  };
  const navigateToPosts = () => {
    console.log('Navigating to posts...');
    try {
      router.replace('/admin/posts');
    } catch (error) {
      console.error('Navigation error to posts:', error);
    }
  };
  const navigateToShops = () => {
    console.log('Navigating to shops...');
    try {
      router.replace('/admin/shops');
    } catch (error) {
      console.error('Navigation error to shops:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PetHubColors.darkGray} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // Chart data
  const pieChartData = [
    {
      name: 'Users',
      population: stats.totalUsers,
      color: '#FF6B6B',
      legendFontColor: PetHubColors.darkGray,
      legendFontSize: 12,
    },
    {
      name: 'Pets',
      population: stats.totalPets,
      color: '#4ECDC4',
      legendFontColor: PetHubColors.darkGray,
      legendFontSize: 12,
    },
    {
      name: 'Posts',
      population: stats.totalPosts,
      color: '#45B7D1',
      legendFontColor: PetHubColors.darkGray,
      legendFontSize: 12,
    },
    {
      name: 'Shops',
      population: stats.totalShops,
      color: '#96CEB4',
      legendFontColor: PetHubColors.darkGray,
      legendFontSize: 12,
    },
  ];

  const barChartData = {
    labels: ['Users', 'Pets', 'Posts', 'Shops'],
    datasets: [
      {
        data: [stats.totalUsers, stats.totalPets, stats.totalPosts, stats.totalShops],
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: PetHubColors.white,
    backgroundGradientFrom: PetHubColors.white,
    backgroundGradientTo: PetHubColors.white,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(32, 32, 33, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(32, 32, 33, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: PetHubColors.darkGray,
    },
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>PetHub Management Center</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={[styles.navButton, styles.navButtonActive]}>
          <Text style={[styles.navButtonText, styles.navButtonTextActive]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={navigateToUsers}>
          <Text style={styles.navButtonText}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={navigateToPets}>
          <Text style={styles.navButtonText}>Pets</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={navigateToPosts}>
          <Text style={styles.navButtonText}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={navigateToShops}>
          <Text style={styles.navButtonText}>Shops</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <View style={[styles.statCard, styles.statCardPrimary]}>
              <Text style={styles.statNumber}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
              <Text style={styles.statSubtext}>+{stats.recentUsers} this week</Text>
            </View>
            <View style={[styles.statCard, styles.statCardSecondary]}>
              <Text style={styles.statNumber}>{stats.totalPets}</Text>
              <Text style={styles.statLabel}>Total Pets</Text>
              <Text style={styles.statSubtext}>+{stats.recentPets} this week</Text>
            </View>
          </View>
          
          <View style={styles.statRow}>
            <View style={[styles.statCard, styles.statCardTertiary]}>
              <Text style={styles.statNumber}>{stats.totalPosts}</Text>
              <Text style={styles.statLabel}>Total Posts</Text>
              <Text style={styles.statSubtext}>+{stats.recentPosts} this week</Text>
            </View>
            <View style={[styles.statCard, styles.statCardQuaternary]}>
              <Text style={styles.statNumber}>{stats.totalShops}</Text>
              <Text style={styles.statLabel}>Total Shops</Text>
              <Text style={styles.statSubtext}>+{stats.recentShops} this week</Text>
            </View>
          </View>
        </View>

        {/* Charts Section */}
        <View style={styles.chartsContainer}>
          <Text style={styles.sectionTitle}>Data Visualization</Text>
          
          {/* Pie Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Content Distribution</Text>
            <PieChart
              data={pieChartData}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              center={[10, 0]}
              absolute
            />
          </View>

          {/* Bar Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Content Overview</Text>
          <BarChart
            data={barChartData}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            verticalLabelRotation={0}
            showValuesOnTopOfBars
            fromZero
            yAxisLabel=""
            yAxisSuffix=""
          />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={navigateToUsers}>
              <Text style={styles.actionIcon}>👥</Text>
              <Text style={styles.actionText}>Manage Users</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={navigateToPets}>
              <Text style={styles.actionIcon}>🐾</Text>
              <Text style={styles.actionText}>Manage Pets</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={navigateToPosts}>
              <Text style={styles.actionIcon}>📝</Text>
              <Text style={styles.actionText}>Manage Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={navigateToShops}>
              <Text style={styles.actionIcon}>🏪</Text>
              <Text style={styles.actionText}>Manage Shops</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PetHubColors.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PetHubColors.lightGray,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: PetHubColors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: PetHubColors.white,
    borderBottomWidth: 1,
    borderBottomColor: PetHubColors.mediumGray,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
  },
  headerSubtitle: {
    fontSize: 14,
    color: PetHubColors.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: PetHubColors.darkGray,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: PetHubColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    padding: 20,
  },
  statRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statCardPrimary: {
    backgroundColor: '#FF6B6B',
  },
  statCardSecondary: {
    backgroundColor: '#4ECDC4',
  },
  statCardTertiary: {
    backgroundColor: '#45B7D1',
  },
  statCardQuaternary: {
    backgroundColor: '#96CEB4',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: PetHubColors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: PetHubColors.white,
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  chartsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: PetHubColors.darkGray,
    marginBottom: 20,
  },
  chartContainer: {
    backgroundColor: PetHubColors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PetHubColors.darkGray,
    marginBottom: 16,
    textAlign: 'center',
  },
  quickActionsContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  actionCard: {
    width: (screenWidth - 56) / 2,
    backgroundColor: PetHubColors.white,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: PetHubColors.darkGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: PetHubColors.darkGray,
    textAlign: 'center',
  },
  // Navigation Bar Styles
  navBar: {
    flexDirection: 'row',
    backgroundColor: PetHubColors.white,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: PetHubColors.mediumGray,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: PetHubColors.lightGray,
    minWidth: 60,
    alignItems: 'center',
  },
  navButtonActive: {
    backgroundColor: PetHubColors.darkGray,
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: PetHubColors.textSecondary,
  },
  navButtonTextActive: {
    color: PetHubColors.white,
  },
});

export default AdminDashboard;
