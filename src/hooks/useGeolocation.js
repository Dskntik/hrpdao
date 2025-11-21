// hooks/useGeolocation.js
import { useState } from "react";
import { useTranslation } from "react-i18next";
import countries from "../utils/countries";

export const useGeolocation = () => {  // ← Важливо: export const
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getGeolocation = async () => {
    setIsLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const errorMsg = t("geolocationNotSupported");
        setError(errorMsg);
        setIsLoading(false);
        reject(new Error(errorMsg));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const data = await response.json();
            const countryCode =
              countries.find((c) => c.name.en === data.countryName)?.code || "";
            
            setIsLoading(false);
            resolve(countryCode);
          } catch (err) {
            const errorMsg = t("geolocationError");
            setError(errorMsg);
            setIsLoading(false);
            reject(new Error(errorMsg));
          }
        },
        (err) => {
          const errorMsg = t("geolocationNotSupported");
          setError(errorMsg);
          setIsLoading(false);
          reject(new Error(errorMsg));
        }
      );
    });
  };

  return {
    getGeolocation,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};
