export interface ReportEmailMessage {
  to: string;
  from: { email: string; name?: string };
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
}

export interface ReportEmailBinding {
  send(message: ReportEmailMessage): Promise<unknown>;
}

interface RuntimeEnv {
  EMAIL?: ReportEmailBinding;
}

export function getEmailBinding(locals: App.Locals): ReportEmailBinding | null {
  const runtime = (locals as { runtime?: { env?: RuntimeEnv } }).runtime;
  return runtime?.env?.EMAIL ?? null;
}
