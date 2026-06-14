import { env } from "cloudflare:workers";

export function getEmailBinding(): SendEmail {
  return env.EMAIL;
}
