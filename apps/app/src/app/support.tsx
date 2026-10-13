import { Heading, PAGE_TOP, Screen, T } from "@/components/ui";
import { useLanguage } from "@/lib/language";
import { OPERATOR } from "@/lib/legal";

const P = ({ children }: { children: string }) => <T tone="muted" size={14} style={{ lineHeight: 21 }}>{children}</T>;

/** Public support page with contact and account deletion instructions (store requirement). */
export default function Support() {
  const { t } = useLanguage();
  return (
    <Screen>
      <T size={28} weight="800" style={{ marginTop: PAGE_TOP }}>{t.legal.supportTitle}</T>
      <P>{t.legal.supportContact(OPERATOR.email)}</P>

      <Heading title={t.legal.supportDeleteHeading} />
      <P>{t.legal.supportDeleteText}</P>

      <Heading title={t.legal.imprint} />
      <P>{`${OPERATOR.name}, ${OPERATOR.address}`}</P>
    </Screen>
  );
}
