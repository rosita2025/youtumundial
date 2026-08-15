
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PIXEL_ID = "2122154438337409";
const ACCESS_TOKEN = "EAAT5JXuLyUUBSJnBuSAOcYfIXFkiNL2tQgT4EgQZAgcmFdPJyqX4W0QJ7P5DGOZCWgD0PiJ3e1QZCg9Fcmu0cs0gLL5RO04RHHQdkOYQEtkA05fIHV2BkaCh6txcLJ1IhI0cZAWuXZC7j5vY48VKKZC8cwelv1SQKgkDIhwTZA2gtky6xr5w8kzmyBaGe4gR8k9qAZDZD";

export const trackFacebookEvent = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    eventName: z.string(),
    eventSourceUrl: z.string(),
    userData: z.object({
      em: z.string().optional(),
      ph: z.string().optional(),
      fn: z.string().optional(),
      ln: z.string().optional(),
      client_ip_address: z.string().optional(),
      client_user_agent: z.string().optional(),
    }).optional(),
    customData: z.record(z.any()).optional(),
  }).parse(data))
  .handler(async ({ data }) => {
    const timestamp = Math.floor(Date.now() / 1000);
    
    const payload = {
      data: [
        {
          event_name: data.eventName,
          event_time: timestamp,
          event_source_url: data.eventSourceUrl,
          action_source: "website",
          user_data: {
            ...data.userData,
            // Hashing would ideally happen here if raw data is provided, 
            // but for simplicity we assume the client might send pre-hashed or we just skip if empty
          },
          custom_data: {
            currency: "USD",
            ...data.customData,
          },
        },
      ],
    };

    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      return { success: true, result };
    } catch (error) {
      console.error("Facebook API Error:", error);
      return { success: false, error: String(error) };
    }
  });
