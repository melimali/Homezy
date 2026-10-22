import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/** Seçilen fotoğrafı uygulamanın kalıcı klasörüne kopyalar (önbellek temizlenince kaybolmasın). */
export function persistPhoto(uri: string, previous?: string | null, folder = 'buzdolabi'): string {
  if (Platform.OS === 'web') return uri;
  const dir = new Directory(Paths.document, folder);
  if (!dir.exists) dir.create({ intermediates: true });
  const dest = new File(dir, `${folder}-${Date.now()}.jpg`);
  new File(uri).copy(dest);
  if (previous) {
    try {
      const old = new File(previous);
      if (old.exists) old.delete();
    } catch {
      // Eski dosya silinemezse sorun değil.
    }
  }
  return dest.uri;
}
