// deno-lint-ignore-file no-explicit-any

import { exists } from "https://deno.land/std@0.125.0/fs/mod.ts";
import {
  post,
  WebhookMessage,
} from "https://deno.land/x/dishooks@v1.0.4/mod.ts";
import { Application } from "https://deno.land/x/oak@v10.1.0/mod.ts";

const vars = [
  {
    name: "$release_url",
    value: (githubJson: any) => githubJson.release.html_url,
  },
  {
    name: "$release_tag_name",
    value: (githubJson: any) => githubJson.release.tag_name,
  },
  {
    name: "$release_name",
    value: (githubJson: any) => githubJson.release.name,
  },
  {
    name: "$release_body",
    value: (githubJson: any) => githubJson.release.body,
  },
  {
    name: "$author_name",
    value: (githubJson: any) => githubJson.release.author.login,
  },
  {
    name: "$author_profile_url",
    value: (githubJson: any) => githubJson.release.author.html_url,
  },
  {
    name: "$author_avatar_url",
    value: (githubJson: any) => githubJson.release.author.avatar_url,
  },
  {
    name: "$repo_name",
    value: (githubJson: any) => githubJson.repository.name,
  },
  {
    name: "$repo_full_name",
    value: (githubJson: any) => githubJson.repository.full_name,
  },
  {
    name: "$repo_url",
    value: (githubJson: any) => githubJson.repository.html_url,
  },
];

interface Config {
  discord_webhook_url: string;
  port: number;
  fieldOn: string;
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

    return config;
  } else {
    throw new Error("No config.json found");
  }
}

function fillVars(githubJson: any, str: string): string {
  for (const replacement of vars) {
    str = str.replace(replacement.name, replacement.value(githubJson));
  }

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

      const releaseNotes = (json.release.body as string).split(config.fieldOn);

      for (const section of releaseNotes) {
        const title = section.split("\n")[0];
        const description = section.split("\n").slice(1).join("\n");
        embed.fields?.push({ name: title, value: description });
      }
    });

    console.log(webhookContent);

    await post(
      config.discord_webhook_url,
      webhookContent,
      true,
      true,
      "[...]",
    );
  }

  ctx.response.status = 200;
});

await app.listen({ port: config.port });
