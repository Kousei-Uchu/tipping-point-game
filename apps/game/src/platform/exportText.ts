import { Share } from "react-native";

/** Native: opens the share sheet so a playtester can send the game log. */
export async function exportText(_filename: string, text: string): Promise<void> {
  await Share.share({ message: text });
}
