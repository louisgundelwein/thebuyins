import { View } from "react-native";
import { Heading, PAGE_TOP, Screen, T } from "@/components/ui";
import { useLanguage } from "@/lib/language";
import { OPERATOR } from "@/lib/legal";

const P = ({ children }: { children: string }) => <T tone="muted" size={14} style={{ lineHeight: 21 }}>{children}</T>;

/** Public privacy policy, linked from both store listings. */
export default function Privacy() {
  const { t } = useLanguage();
  return (
    <Screen>
      <T size={28} weight="800" style={{ marginTop: PAGE_TOP }}>{t.legal.privacyTitle}</T>
      <P>{t.legal.privacyController(`${OPERATOR.name}, ${OPERATOR.address}, ${OPERATOR.email}`)}</P>

      {t.legal.privacy.map((section) => (
        <View key={section.heading}>
          <Heading title={section.heading} />
          <P>{section.body}</P>
        </View>
      ))}
    </Screen>
  );
}
