import { Heading, Screen, T } from "@/components/ui";
import { OPERATOR } from "@/lib/legal";

const P = ({ children }: { children: string }) => <T tone="muted" size={14} style={{ lineHeight: 21 }}>{children}</T>;

/** Public privacy policy, linked from both store listings. */
export default function Privacy() {
  return (
    <Screen>
      <T size={28} weight="800" style={{ marginTop: 24 }}>Datenschutz</T>
      <P>{`Verantwortlich: ${OPERATOR.name}, ${OPERATOR.address}, ${OPERATOR.email}`}</P>

      <Heading title="Welche Daten wir speichern" />
      <P>Für deinen Account: Name, E-Mail-Adresse und ein verschlüsseltes Passwort. Für die Nutzung: Gruppen, Spiele, Buy-ins und Ergebnisse, die du oder deine Mitspieler eintragen. Zur Sicherheit der Anmeldung speichern wir Sitzungsdaten wie IP-Adresse und Gerätetyp.</P>

      <Heading title="Wofür" />
      <P>Ausschließlich, um die App bereitzustellen: Anmeldung, Spiele erfassen und Abrechnungen innerhalb deiner Gruppen anzeigen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</P>

      <Heading title="Was wir nicht tun" />
      <P>Keine Werbung, kein Tracking, keine Analyse-Tools, kein Verkauf von Daten. Die App wickelt keine Zahlungen ab.</P>

      <Heading title="Wer die Daten sieht" />
      <P>Mitglieder deiner Gruppen sehen deinen Namen und deine Spielergebnisse. Die Daten liegen auf Servern in der EU.</P>

      <Heading title="Deine Rechte" />
      <P>Du kannst deinen Account jederzeit in der App unter Profil, Account löschen. Für Auskunft, Berichtigung oder Löschung erreichst du uns unter der oben genannten E-Mail-Adresse. Du hast außerdem ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde.</P>
    </Screen>
  );
}
