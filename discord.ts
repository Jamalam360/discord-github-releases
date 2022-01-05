interface EmbedFooter {
  text: string;
  icon_url?: string;
}

interface EmbedAuthor {
  name: string;
  url?: string;
  icon_url?: string;
}

interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface Embed {
  title?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: EmbedFooter;
  author?: EmbedAuthor;
  fields?: EmbedField[];
}

export interface WebhookMessage {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: Embed[];
}
