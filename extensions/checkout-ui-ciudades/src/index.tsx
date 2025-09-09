/// <reference types="@shopify/ui-extensions-checkout" />
import React, {useState} from "react";
import {
  render,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  ScrollView,
  Divider,
  Button,
  View,
  useApplyAttributeChange,
  useBuyerJourneyIntercept,
} from "@shopify/ui-extensions-react/checkout";
import {citiesToSeed} from "./utils/cities";

type City = { name: string; province: string; routeName: string };

render("purchase.checkout.delivery-address.render-after", () => <Extension />);

function Extension() {
  // ------------------ ATRIBUTOS Y VALIDACIÓN ------------------
  const applyAttributeChange = useApplyAttributeChange();

  const [whatsapp, setWhatsapp] = useState("");
  const [documento, setDocumento] = useState("");

  const normPhone = (s: string) => s.replace(/\s|-/g, "");

  function validateWhatsapp(value: string) {
    const v = normPhone(value);
    if (!v) return {valid: false, msg: "Ingresa tu número de WhatsApp."};
    // Ecu: 09 + 8 dígitos (total 10) o +5939 + 8 dígitos
    if (/^09\d{8}$/.test(v)) return {valid: true};
    if (/^\+5939\d{8}$/.test(v)) return {valid: true};
    if (v.startsWith("09")) return {valid: false, msg: "Debe tener 10 dígitos y empezar con 09 (ej. 09XXXXXXXX)."};
    if (v.startsWith("+593")) return {valid: false, msg: "Usa +5939 seguido de 8 dígitos (ej. +5939XXXXXXXX)."};
    return {valid: false, msg: "Formato no válido. Ej: 09XXXXXXXX o +5939XXXXXXXX."};
  }

  function validateDocumento(value: string) {
    const v = value.trim().toUpperCase();
    if (!v) return {valid: false, msg: "Ingresa tu Cédula, RUC o Pasaporte."};
    if (/^\d{10}$/.test(v)) return {valid: true};          // Cédula
    if (/^\d{13}$/.test(v)) return {valid: true};          // RUC
    if (/^[A-Z0-9]{6,20}$/.test(v)) return {valid: true};  // Pasaporte simple
    return {
      valid: false,
      msg: "Formato no válido. Cédula: 10 dígitos · RUC: 13 dígitos · Pasaporte: 6–20 letras/números.",
    };
  }

  const w = validateWhatsapp(whatsapp);
  const d = validateDocumento(documento);

  // guarda como atributos (se verán en el pedido)
  const saveAttr = (key: string, value: string) =>
    applyAttributeChange({type: "updateAttribute", key, value});

  const onChangeWhatsapp = (v: string) => {
    setWhatsapp(v);
    saveAttr("whatsapp", v);
  };
  const onChangeDocumento = (v: string) => {
    setDocumento(v);
    saveAttr("documento", v);
  };

  // Bloquear avance si faltan o son inválidos
  useBuyerJourneyIntercept(({canBlockProgress}) => {
    if (!canBlockProgress) return {behavior: "allow" as const};

    if (!w.valid || !d.valid) {
      return {
        behavior: "block" as const,
        reason: "Faltan datos obligatorios",
        errors: [
          ...(w.valid ? [] : [{message: w.msg!}]),
          ...(d.valid ? [] : [{message: d.msg!}]),
        ],
      };
    }
    return {behavior: "allow" as const};
  });

  // ------------------ BUSCADOR DE CIUDADES (solo name) ------------------
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const norm = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const q = norm(query);
  const results: City[] =
    q.length === 0
      ? []
      : citiesToSeed
          .map((c) => {
            const nn = norm(c.name);
            const np = norm(c.province);
            const nr = norm(c.routeName);
            let score = 0;
            if (nn.startsWith(q)) score = 2;
            else if (nn.includes(q)) score = 1;
            else if (np.includes(q) || nr.includes(q)) score = 0.5;
            return {c, score};
          })
          .filter((s) => s.score > 0)
          .sort((a, b) => b.score - a.score || a.c.name.length - b.c.name.length)
          .slice(0, 100)
          .map((s) => s.c);

  return (
    <BlockStack spacing="loose">
      {/* Datos obligatorios */}
      <View border="base" padding="base" borderRadius="base">
        <BlockStack spacing="loose">
          <Text emphasis>Datos de contacto (obligatorios)</Text>

          <TextField
            label="WhatsApp"
            value={whatsapp}
            onChange={onChangeWhatsapp}
            required
            hint="Formato: 09XXXXXXXX o +5939XXXXXXXX"
            error={w.valid ? undefined : w.msg}
            autoComplete="off"
          />

          <TextField
            label="Cédula / RUC / Pasaporte"
            value={documento}
            onChange={onChangeDocumento}
            required
            hint="Cédula: 10 dígitos · RUC: 13 dígitos · Pasaporte: 6–20 (letras/números)"
            error={d.valid ? undefined : d.msg}
            autoComplete="off"
          />
        </BlockStack>
      </View>

      {/* Buscador de ciudades */}
      <Button kind="plain" onPress={() => setOpen((v) => !v)} accessibilityLabel="Ver ciudades disponibles">
        {open ? "Ocultar ciudades" : "Click aquí para revisar las ciudades disponibles"}
      </Button>

      {open && (
        <View border="base" padding="base" borderRadius="base">
          <BlockStack spacing="loose">
            <Text>
              Busca tu ciudad y pégala en el campo <Text emphasis>Ciudad</Text>.
            </Text>

            <TextField
              label="Buscar ciudad"
              value={query}
              onChange={setQuery}
              placeholder="Ej. baños, quito, guayaquil…"
              clearButton
              onClearButtonPress={() => setQuery("")}
              autoComplete="off"
            />

            <Divider />

            {query.trim().length === 0 ? (
              <Text appearance="subdued">Empieza a escribir para ver resultados.</Text>
            ) : results.length === 0 ? (
              <Text appearance="subdued">No hay resultados para “{query}”.</Text>
            ) : (
              <ScrollView maxBlockSize={360}>
                <BlockStack spacing="tight">
                  {results.map((c) => (
                    <InlineStack
                      key={`${c.name}-${c.province}-${c.routeName}`}
                      spacing="tight"
                      blockAlignment="center"
                      inlineAlignment="start"
                    >
                      <Text>{c.name}</Text>
                    </InlineStack>
                  ))}
                </BlockStack>
              </ScrollView>
            )}

            <InlineStack inlineAlignment="end">
              <Button kind="secondary" onPress={() => setOpen(false)}>Cerrar</Button>
            </InlineStack>
          </BlockStack>
        </View>
      )}
    </BlockStack>
  );
}
