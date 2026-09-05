import { getLocale, getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/legal-page";

const UPDATED_ON = "2026-09-05";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@example.com";

export async function generateMetadata() {
  const t = await getTranslations("legal");
  return { title: t("termsTitle") };
}

export default async function TermsPage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("legal")]);

  return (
    <LegalPage title={t("termsTitle")} updatedLabel={t("lastUpdated")} updatedOn={UPDATED_ON}>
      {locale === "tr" ? <Turkish /> : <English />}
    </LegalPage>
  );
}

function Turkish() {
  return (
    <>
      <p>
        us-stream'i kullanarak bu koşulları kabul etmiş olursun. Hizmet olduğu gibi sunulur ve
        ücretsizdir.
      </p>

      <h2>Hesabın</h2>
      <p>
        Hesabının güvenliğinden sen sorumlusun. Hesabını başkasıyla paylaşma ve şifreni gizli tut.
        Bir başkasının hesabına izinsiz erişmeye çalışmak yasaktır.
      </p>

      <h2>Kabul edilebilir kullanım</h2>
      <ul>
        <li>Yasadışı içerik paylaşmak, taciz etmek veya başkalarını tehdit etmek yasaktır.</li>
        <li>
          Katılımcıları haberdar etmeden toplantıyı kaydetmek, bulunduğun ülkenin yasalarına aykırı
          olabilir; sorumluluk sana aittir.
        </li>
        <li>
          Servisi otomatik araçlarla aşırı yüklemek, güvenlik önlemlerini aşmaya çalışmak veya
          başkalarının görüşmelerini bozmak yasaktır.
        </li>
      </ul>

      <h2>Toplantı içeriği</h2>
      <p>
        Paylaştığın içerik sana aittir. Bize yalnızca hizmeti sunmak için gereken ölçüde saklama ve
        iletme izni vermiş olursun. Bu koşulları ihlal eden içeriği kaldırma hakkımız saklıdır.
      </p>

      <h2>Kesinti ve garanti</h2>
      <p>
        Hizmet ücretsiz sunulur ve kesintisiz çalışacağı garanti edilmez. Veri kaybı, kesinti veya
        toplantının aksamasından doğan zararlardan sorumlu tutulamayız. Önemli içeriğin yedeğini
        kendin al.
      </p>

      <h2>Değişiklikler</h2>
      <p>
        Bu koşullar zaman zaman güncellenebilir. Önemli bir değişiklik olursa sayfanın üstündeki
        tarih değişir.
      </p>

      <h2>İletişim</h2>
      <p>
        <strong>{CONTACT_EMAIL}</strong>
      </p>
    </>
  );
}

function English() {
  return (
    <>
      <p>
        By using us-stream you accept these terms. The service is provided as-is and free of charge.
      </p>

      <h2>Your account</h2>
      <p>
        You are responsible for your account's security. Do not share it, and keep your password
        private. Attempting to access someone else's account is prohibited.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not share illegal content, harass people, or threaten anyone.</li>
        <li>
          Recording a meeting without telling the participants may break the law where you live.
          That responsibility is yours.
        </li>
        <li>
          Do not overload the service with automated tools, attempt to bypass its security, or
          disrupt other people's calls.
        </li>
      </ul>

      <h2>Meeting content</h2>
      <p>
        What you share remains yours. You grant us only the permission needed to store and transmit
        it in order to run the service. We may remove content that breaks these terms.
      </p>

      <h2>Availability and warranty</h2>
      <p>
        The service is free and not guaranteed to be uninterrupted. We are not liable for data loss,
        downtime or a disrupted meeting. Keep your own copy of anything important.
      </p>

      <h2>Changes</h2>
      <p>
        These terms may be updated from time to time. When something meaningful changes, the date at
        the top of this page changes with it.
      </p>

      <h2>Contact</h2>
      <p>
        <strong>{CONTACT_EMAIL}</strong>
      </p>
    </>
  );
}
