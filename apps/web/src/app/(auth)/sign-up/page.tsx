import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/components/auth-form";
import { env } from "@/env";
import { safeNextPath } from "@/lib/redirect";
import { getSession } from "@/lib/session";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("signUpTitle") };
}

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  if (await getSession()) {
    redirect("/dashboard");
  }

  const t = await getTranslations("auth");
  const next = safeNextPath((await searchParams).next);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{t("signUpTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("signUpSubtitle")}</p>
      </header>

      <AuthForm
        mode="sign-up"
        googleEnabled={Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)}
        next={next}
      />
    </div>
  );
}
