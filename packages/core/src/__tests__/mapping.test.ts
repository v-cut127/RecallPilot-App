import { describe, expect, it } from "vitest";
import { suggestMapping, validateMapping } from "../mapping";

describe("column mapping", () => {
  it("maps English headers", () => {
    const mapping = suggestMapping([
      "Patient ID",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Last Visit",
      "Treatment",
      "Location",
      "Provider",
      "Production",
      "Email Consent",
    ]);
    expect(mapping).toMatchObject({
      external_id: "Patient ID",
      first_name: "First Name",
      last_name: "Last Name",
      email: "Email",
      phone: "Phone",
      last_visit_date: "Last Visit",
      treatment_type: "Treatment",
      location: "Location",
      provider: "Provider",
      production_value: "Production",
      consent_email: "Email Consent",
    });
  });

  it("maps German headers used by the semicolon seed export", () => {
    const mapping = suggestMapping([
      "Patienten-ID",
      "Vorname",
      "Nachname",
      "E-Mail",
      "Telefon",
      "Geburtsdatum",
      "Letzter Besuch",
      "Nächste Kontrolle",
      "Behandlung",
      "Recall-Intervall",
      "Standort",
      "Behandler",
      "Umsatz",
      "E-Mail-Einwilligung",
      "SMS-Einwilligung",
      "Sprache",
    ]);
    expect(mapping).toMatchObject({
      external_id: "Patienten-ID",
      first_name: "Vorname",
      last_name: "Nachname",
      email: "E-Mail",
      phone: "Telefon",
      birth_date: "Geburtsdatum",
      last_visit_date: "Letzter Besuch",
      next_recall_date: "Nächste Kontrolle",
      treatment_type: "Behandlung",
      recall_interval_months: "Recall-Intervall",
      location: "Standort",
      provider: "Behandler",
      production_value: "Umsatz",
      consent_email: "E-Mail-Einwilligung",
      consent_sms: "SMS-Einwilligung",
      locale: "Sprache",
    });
  });

  it("maps Dutch headers", () => {
    const mapping = suggestMapping([
      "Patientnummer",
      "Voornaam",
      "Achternaam",
      "E-mailadres",
      "Telefoon",
      "Geboortedatum",
      "Laatste bezoek",
      "Volgende controle",
      "Behandeling",
      "Locatie",
      "Behandelaar",
      "Omzet",
    ]);
    expect(mapping).toMatchObject({
      first_name: "Voornaam",
      last_name: "Achternaam",
      email: "E-mailadres",
      phone: "Telefoon",
      birth_date: "Geboortedatum",
      last_visit_date: "Laatste bezoek",
      next_recall_date: "Volgende controle",
      treatment_type: "Behandeling",
      location: "Locatie",
      provider: "Behandelaar",
      production_value: "Omzet",
    });
  });

  it("requires an identity column and a date column", () => {
    expect(validateMapping({ email: "Email" }, ["Email"])).toHaveLength(2);
    expect(validateMapping({ first_name: "First", last_visit_date: "Last Visit" }, ["First", "Last Visit"])).toEqual(
      []
    );
    expect(validateMapping({ first_name: "Missing", last_visit_date: "Last Visit" }, ["Last Visit"])).toHaveLength(1);
  });
});
