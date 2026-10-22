import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/** Seçilen fotoğrafı uygulamanın kalıcı klasörüne kopyalar (önbellek temizlenince kaybolmasın). */
export function persistPhoto(uri: string, folder: string, previous?: string | null): string {
  if (Platform.OS === 'web') return uri;
  const dir = new Directory(Paths.document, folder);
  if (!dir.exists) dir.create({ intermediates: true });
  const dest = new File(dir, `${folder}-${Date.now()}.jpg`);
  new File(uri).copy(dest);
  if (previous) deletePhoto(previous);
  return dest.uri;
}

export function deletePhoto(uri: string) {
  if (Platform.OS === 'web') return;
  try {
    const old = new File(uri);
    if (old.exists) old.delete();
  } catch {
    // Eski dosya silinemezse sorun değil.
  }
}

/** Telefonda hâlâ duran bir dosya mı (yedekten gelen başka telefonun yolu değil). */
export function photoExists(uri: string | null | undefined) {
  if (!uri) return false;
  if (Platform.OS === 'web') return true;
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

/** Kameradan ya da galeriden bir fotoğraf seçtirir. İzin yoksa ya da vazgeçilirse `error` / null. */
export async function pickPhoto(source: 'camera' | 'library'): Promise<{ uri: string } | { error: string } | null> {
  const perm = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { error: source === 'camera' ? 'Kamera izni gerekli.' : 'Galeri izni gerekli.' };
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.[0]) return null;
  return { uri: res.assets[0].uri };
}
