import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "@/screens/HomeScreen";
import ProcessingScreen from "@/screens/ProcessingScreen";
import ResultScreen from "@/screens/ResultScreen";

export type RootStackParamList = {
  Home: undefined;
  Processing: { jobId: string };
  Result: { jobId: string; resultUrl: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#030712" },
          headerTintColor: "#f3f4f6",
          headerTitleStyle: { fontWeight: "700" },
          cardStyle: { backgroundColor: "#030712" },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Deepfake OTOP" }}
        />
        <Stack.Screen
          name="Processing"
          component={ProcessingScreen}
          options={{ title: "Traitement en cours", headerBackVisible: false }}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{ title: "Résultat" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
