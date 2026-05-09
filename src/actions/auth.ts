"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const signupSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  display_name: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(40, "Display name must be 40 characters or fewer"),
});

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type ActionResult = { error?: string };

export async function signUpAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    display_name: formData.get("display_name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.display_name },
    },
  });

  if (error) return { error: error.message };

  // If email confirmation is enabled, the user is created but no session.
  // We still redirect to dashboard — middleware will bounce to /login if no session.
  if (!data.session) {
    redirect("/login?notice=check-email");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function loginAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  // Defensive: reject the request outright if either field is missing or
  // empty. This catches scripted POSTs that bypass the HTML `required`
  // attribute and any oddity where the browser submits without a password.
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");
  if (typeof rawEmail !== "string" || rawEmail.trim().length === 0) {
    return { error: "Email is required" };
  }
  if (typeof rawPassword !== "string" || rawPassword.length === 0) {
    return { error: "Password is required" };
  }

  const parsed = loginSchema.safeParse({
    email: rawEmail,
    password: rawPassword,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  const next = (formData.get("next") as string) || "/dashboard";
  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

const passwordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

export type PasswordResult = { error?: string; ok?: boolean };

export async function updatePasswordAction(
  _prev: PasswordResult | undefined,
  formData: FormData,
): Promise<PasswordResult> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { ok: true };
}
