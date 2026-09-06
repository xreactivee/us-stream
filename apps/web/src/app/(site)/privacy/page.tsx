import { getLocale, getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/legal-page";

const UPDATED_ON = "2026-09-05";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@example.com";

export async function generateMetadata() {
  const t = await getTranslations("legal");
  return { title: t("privacyTitle") };
}

export default async function PrivacyPage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("legal")]);

  return (
    <LegalPage title={t("privacyTitle")} updatedLabel={t("lastUpdated")} updatedOn={UPDATED_ON}>
      {locale === "tr" ? <Turkish /> : <English />}
    </LegalPage>
  );
}

function Turkish() {
  return (
    <>
      <p>
        us-stream, insanların oda açıp görüntülü ve sesli görüşebildiği, ekran paylaşabildiği bir
        toplantı platformudur. Bu sayfa hangi verileri topladığımızı ve neden topladığımızı anlatır.
      </p>

      <h2>Topladığımız veriler</h2>
      <ul>
        <li>
          <strong>Hesap bilgileri.</strong> E-posta adresin, adın ve Google ile giriş yaptıysan
          profil fotoğrafın. Bunlar hesabını tanımlamak ve odalarında seni göstermek için gerekli.
        </li>
        <li>
          <strong>Oda ve toplantı kayıtları.</strong> Açtığın odaların adı ve ayarları,
          toplantıların başlangıç ve bitiş zamanı, kimlerin katıldığı ve ne kadar kaldığı.
        </li>
        <li>
          <strong>Toplantı içeriği.</strong> Sohbet mesajları, anketler, sorular ve beyaz tahta ile
          ortak notların içeriği. Bunlar toplantı sonrası geçmişte görüntülenebilsin diye saklanır.
        </li>
        <li>
          <strong>Tercihler.</strong> Dil ve tema seçimin, bir çerezde ve hesabında.
        </li>
      </ul>

      <h2>Toplamadığımız veriler</h2>
      <p>
        <strong>Görüntü ve ses akışları kaydedilmez.</strong> Kamera, mikrofon ve ekran paylaşımı
        verileri katılımcılar arasında aktarılır, sunucuda saklanmaz. Reklam amaçlı takip yapmıyoruz
        ve üçüncü taraf analiz araçları kullanmıyoruz.
      </p>

      <h2>Hesap açmadan katılanlar</h2>
      <p>
        Bir davet bağlantısıyla hesap açmadan katılabilirsin. Bu durumda sadece girdiğin görünen ad
        ve o toplantıya özel geçici bir kimlik saklanır; toplantı bittikten sonra bunlar geçmiş
        kaydının parçası olarak kalır.
      </p>

      <h2>Google ile giriş</h2>
      <p>
        Google ile giriş yaptığında Google'dan yalnızca adını, e-posta adresini ve profil
        fotoğrafını alırız. Gmail, Drive veya takvim gibi hiçbir Google servisine erişimimiz yoktur
        ve talep etmiyoruz.
      </p>

      <h2>Verilerin nerede durduğu</h2>
      <p>
        Veriler MongoDB Atlas üzerinde barındırılır. Görüntü ve ses akışları LiveKit altyapısı
        üzerinden geçer ve orada da saklanmaz.
      </p>

      <h2>Silme</h2>
      <p>
        Bir odayı sildiğinde o odaya ait toplantılar, sohbet geçmişi, anketler, beyaz tahta ve
        notlar da silinir. Hesabını silmek istersen aşağıdaki adresten yaz; hesabın ve ona bağlı tüm
        veriler kaldırılır.
      </p>

      <h2>İletişim</h2>
      <p>
        Sorular ve veri silme talepleri için: <strong>{CONTACT_EMAIL}</strong>
      </p>
    </>
  );
}

function English() {
  return (
    <>
      <p>
        us-stream is a meeting platform where people open rooms, talk over video and audio, and
        share their screens. This page explains what we collect and why.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details.</strong> Your email address, your name, and your profile picture
          if you signed in with Google. These identify your account and label you inside a room.
        </li>
        <li>
          <strong>Room and meeting records.</strong> The names and settings of rooms you create,
          when each meeting started and ended, who joined and how long they stayed.
        </li>
        <li>
          <strong>Meeting content.</strong> Chat messages, polls, questions, and the contents of the
          whiteboard and shared notes, kept so a meeting can be read back afterwards.
        </li>
        <li>
          <strong>Preferences.</strong> Your language and theme, in a cookie and on your account.
        </li>
      </ul>

      <h2>What we do not collect</h2>
      <p>
        <strong>Audio and video are never recorded.</strong> Camera, microphone and screen-share
        data passes between participants and is not stored on any server. We do not run advertising
        trackers or third-party analytics.
      </p>

      <h2>Joining without an account</h2>
      <p>
        You can join from an invite link without signing up. In that case we store only the display
        name you typed and a temporary identity scoped to that one meeting, which remains as part of
        the meeting's history afterwards.
      </p>

      <h2>Signing in with Google</h2>
      <p>
        When you sign in with Google we receive only your name, email address and profile picture.
        We have no access to Gmail, Drive, Calendar or any other Google service, and we do not
        request it.
      </p>

      <h2>Where the data lives</h2>
      <p>
        Data is stored in MongoDB Atlas. Audio and video travel through LiveKit's infrastructure and
        are not retained there either.
      </p>

      <h2>Deletion</h2>
      <p>
        Deleting a room also deletes its meetings, chat history, polls, whiteboard and notes. To
        delete your account, write to the address below and the account and everything attached to
        it will be removed.
      </p>

      <h2>Contact</h2>
      <p>
        Questions and deletion requests: <strong>{CONTACT_EMAIL}</strong>
      </p>
    </>
  );
}
