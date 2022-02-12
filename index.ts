import { exists } from "https://deno.land/std@0.119.0/fs/mod.ts";
import {
  post,
  WebhookMessage,
} from "https://deno.land/x/dishooks@v1.0.4/mod.ts";
import { Application } from "https://deno.land/x/oak@v10.1.0/mod.ts";

interface Config {
  discord_webhook_url: string;
  port: number;
  message: WebhookMessage;
}

//TODO: improve config parsing and checking
async function readConfig(): Promise<Config> {
  if (await exists("config.json")) {
    const text = await Deno.readTextFile("config.json");
    const config: Config = JSON.parse(text);

    if (!config.discord_webhook_url) {
      throw new Error("No discord_webhook_url provided in config.json");
    }

    if (!config.port) {
      console.warn("Using default port (8080)");
      config.port = 8080;
    }

    if (!config.message) {
      throw new Error("No message provided in config.json");
    }

    if (!config.message.content && !config.message.embeds) {
      throw new Error(
        "At least one of content or embeds must be provided in config.json",
      );
    }

    return config;
  } else {
    throw new Error("No config.json found");
  }
}

//TODO: oh god send help
// deno-lint-ignore no-explicit-any
function fillVars(githubJson: any, str: string): string {
  str = str.replace("$release_url", githubJson.release.html_url);
  str = str.replace("$release_tag_name", githubJson.release.tag_name);
  str = str.replace("$release_name", githubJson.release.name);
  str = str.replace("$release_body", githubJson.release.body);
  str = str.replace("$author_name", githubJson.release.author.login);
  str = str.replace("$author_profile_url", githubJson.release.author.html_url);
  str = str.replace("$author_avatar_url", githubJson.release.author.avatar_url);
  str = str.replace("$repo_name", githubJson.repository.name);
  str = str.replace("$repo_full_name", githubJson.repository.full_name);
  str = str.replace("$repo_url", githubJson.repository.html_url);
  return str;
}

const config = await readConfig();
const app = new Application();

app.use(async (ctx) => {
  const json = await ctx.request.body().value;

  if (await json.action == "published") {
    const webhookContent: WebhookMessage = JSON.parse(
      JSON.stringify(config.message),
    );

    webhookContent.avatar_url = webhookContent.avatar_url
      ? fillVars(json, webhookContent.avatar_url)
      : undefined;
    webhookContent.content = webhookContent.content
      ? fillVars(json, webhookContent.content)
      : undefined;
    webhookContent.username = webhookContent.username
      ? fillVars(json, webhookContent.username)
      : undefined;
    webhookContent.embeds?.forEach((embed) => {
      if (embed.author) {
        embed.author.icon_url = embed.author.icon_url
          ? fillVars(json, embed.author.icon_url)
          : undefined;
        embed.author.name = fillVars(json, embed.author.name);
        embed.author.url = embed.author.url
          ? fillVars(json, embed.author.url)
          : undefined;
      }

      if (embed.fields) {
        embed.fields.forEach((field) => {
          field.name = fillVars(json, field.name);
          field.value = fillVars(json, field.value);
        });
      }

      if (embed.footer) {
        embed.footer.text = fillVars(json, embed.footer.text);
        embed.footer.icon_url = embed.footer.icon_url
          ? fillVars(json, embed.footer.icon_url)
          : undefined;
      }

      if (!embed.timestamp) {
        embed.timestamp = new Date().toISOString();
      }

      embed.title = embed.title ? fillVars(json, embed.title) : undefined;

      embed.description = embed.description
        ? fillVars(json, embed.description)
        : undefined;

      embed.url = embed.url ? fillVars(json, embed.url) : undefined;
    });

    const res = await post(
      config.discord_webhook_url,
      webhookContent,
      true,
      true,
      "[...]",
    );
    console.log(res.status);
    console.log(res.message);
  }

  ctx.response.status = 200;
});

await app.listen({ port: config.port });
