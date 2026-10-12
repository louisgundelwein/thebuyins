import { Heading, Screen, T } from "@/components/ui";
import { OPERATOR } from "@/lib/legal";

const P = ({ children }: { children: string }) => <T tone="muted" size={14} style={{ lineHeight: 21 }}>{children}</T>;

/** Public support page with contact and account deletion instructions (store requirement). */
export default function Support() {
  return (
    <Screen>
      <T size={28} weight="800" style={{ marginTop: 24 }}>Support</T>
      <P>{`Fragen, Fehler oder Wünsche: ${OPERATOR.email}`}</P>

      <Heading title="Account löschen" />
      <P>In der App oben rechts auf dein Profilbild tippen, dann Account und Account löschen. Ohne Zugriff auf die App schreib uns von deiner registrierten E-Mail-Adresse, wir löschen den Account innerhalb von 30 Tagen.</P>

      <Heading title="Impressum" />
      <P>{`${OPERATOR.name}, ${OPERATOR.address}`}</P>
    </Screen>
  );
}
