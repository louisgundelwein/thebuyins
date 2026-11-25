import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { currencies, type Currency } from "@thebuyins/core";
import { getLocales } from "expo-localization";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const storageKey = "default-currency";
const queryKey = [storageKey] as const;
const regionalCurrencies: Readonly<Record<string, Currency>> = {
  US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", CH: "CHF",
  JP: "JPY", CN: "CNY", IN: "INR", MX: "MXN",
};

/** Reads the saved override. On first use, preselects the device's supported currency or EUR. */
export function useDefaultCurrency() {
  const client = useQueryClient();
  const preference = useQuery({
    queryKey,
    networkMode: "always",
    staleTime: Infinity,
    queryFn: async () => {
      const saved = Platform.OS === "web" ? localStorage.getItem(storageKey) : await SecureStore.getItemAsync(storageKey);
      if (saved === null) {
        const region = getLocales()[0];
        if (region.currencyCode !== null) return currencies.find((code) => code === region.currencyCode) ?? "EUR";
        return regionalCurrencies[region.regionCode ?? ""] ?? "EUR";
      }
      const currency = currencies.find((code) => code === saved);
      if (!currency) throw new Error(`Invalid default currency: ${saved}`);
      return currency;
    },
  });
  const save = useMutation({
    networkMode: "always",
    mutationFn: async (currency: Currency) => {
      if (Platform.OS === "web") localStorage.setItem(storageKey, currency);
      else await SecureStore.setItemAsync(storageKey, currency);
    },
    onSuccess: (_, currency) => client.setQueryData(queryKey, currency),
  });
  return { preference, save };
}
