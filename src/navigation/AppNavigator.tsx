import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { SetupGameScreen } from '../screens/SetupGameScreen';
import { RikikiScreen } from '../screens/RikikiScreen';
import { YahtzeeScreen } from '../screens/YahtzeeScreen';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="SetupGame" component={SetupGameScreen} />
          <Stack.Screen name="Rikiki" component={RikikiScreen} />
          <Stack.Screen name="Yahtzee" component={YahtzeeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a1a2e' },
});
