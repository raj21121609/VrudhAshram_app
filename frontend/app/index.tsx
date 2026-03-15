import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  // This screen will only show briefly while _layout handles the redirect based on auth status.
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
