import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "@/screens/HomeScreen";
import ProcessingScreen from "@/screens/ProcessingScreen";
import ResultScreen from "@/screens/ResultScreen";
import CameraScreen from "@/screens/CameraScreen";
import SettingsScreen from "@/screens/SettingsScreen";

export type RootStackParamList = {
  Home: undefined;
  Camera: { onRecorded: (uri: string) => void };
  Processing: { jobId: string };
  Result: { jobId: string; resultUrl: string };
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: "#030712",
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTintColor: "#e2e8f0",
          headerTitleStyle: { fontWeight: "700", fontSize: 17 },
          cardStyle: { backgroundColor: "#030712" },
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Camera"
          component={CameraScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Processing"
          component={ProcessingScreen}
          options={{
            title: "Traitement IA",
            headerLeft: () => null, // Disable back button
          }}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{ title: "Résultat" }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Paramètres" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
