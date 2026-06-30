import type { APIRoute } from "astro";
import { mapSignupErrorMessage } from "@/lib/auth/signup-errors";
import { createClient } from "@/lib/supabase";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = form.get("email") as string;
  const password = form.get("password") as string;
  const confirmPassword = form.get("confirmPassword") as string;
  const acceptTerms = form.get("acceptTerms");

  if (password !== confirmPassword) {
    return context.redirect(`/auth/signup?error=${encodeURIComponent("Hasła nie są identyczne")}`);
  }

  if (acceptTerms !== "on") {
    return context.redirect(
      `/auth/signup?error=${encodeURIComponent("Musisz zaakceptować Regulamin i Politykę Prywatności")}`,
    );
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/auth/signup?error=${encodeURIComponent("Supabase is not configured")}`);
  }

  await supabase.auth.signOut();

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return context.redirect(`/auth/signup?error=${encodeURIComponent(mapSignupErrorMessage(error.message))}`);
  }

  await supabase.auth.signOut();

  return context.redirect("/auth/confirm-email");
};
