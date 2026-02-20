import { API_CONSTANTS } from "grammy";

type TelegramUpdateType = (typeof API_CONSTANTS.ALL_UPDATE_TYPES)[number];

export function resolveTelegramAllowedUpdates(): ReadonlyArray<TelegramUpdateType> {
  const updates = [...API_CONSTANTS.DEFAULT_UPDATE_TYPES] as TelegramUpdateType[];
  if (!updates.includes("message_reaction")) {
    updates.push("message_reaction");
  }
  if (!updates.includes("channel_post")) {
    updates.push("channel_post");
  }
  // Нужен для получения реакций в каналах (анонимные агрегированные реакции).
  // message_reaction приходит только в группах/личных чатах (с userId),
  // в каналах Telegram шлёт только message_reaction_count.
  if (!updates.includes("message_reaction_count")) {
    updates.push("message_reaction_count");
  }
  return updates;
}
