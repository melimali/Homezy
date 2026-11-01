// Bildirim düğmelerinin arka plan görevi, uygulama ekransız açıldığında da tanımlı olmalı.
import './src/notifications/background';
// Ana ekran widget'ının görevi de öyle: sistem widget'ı uygulama kapalıyken çizdirir.
import './src/widget/widget';
import 'expo-router/entry';
