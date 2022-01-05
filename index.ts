import { exists } from "https://deno.land/std@0.119.0/fs/mod.ts";
import { serve } from "https://deno.land/std@0.119.0/http/server.ts";

interface Config {
  discord_webhook_url: string;
  port: number;
}

async function readConfig(): Promise<Config> {
  if (await exists("config.json")) {
    const text = await Deno.readTextFile("config.json");
    return JSON.parse(text);
  } else {
    console.error(
      "Config file not found! Please create one according to the example.",
    );
    Deno.exit(1);
  }
}

const config = await readConfig();

const handler = async (req: Request): Promise<Response> => {
  const json = await req.json();

  if (json.action == "published") {
    const webhookContent = {
      embeds: [
        {
          title: `New release published`,
          description:
            `${json.release.author.login} has published version '${json.release.tag_name}' of ${json.repository.full_name}`,
          url: json.release.html_url,
          fields: [
            {
              name: "Release Description",
              value: json.release.body,
            },
          ],
        },
      ],
    };

    console.log(JSON.stringify(webhookContent));

    const req = await fetch(config.discord_webhook_url, {
      method: "POST",
      body: JSON.stringify(webhookContent),
    });

    console.log(req);
  }

  return new Response("Success", { status: 200 });
};

await serve(handler, { port: config.port });
