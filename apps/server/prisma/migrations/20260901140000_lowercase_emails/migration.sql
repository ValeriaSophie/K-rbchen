-- E-Mail-Adressen werden ab jetzt normalisiert (klein) gespeichert und gesucht.
-- Ohne diesen Backfill käme ein Konto, das als "Anna@Example.de" angelegt wurde,
-- beim Login nicht mehr durch: die Anfrage sucht "anna@example.de", der
-- case-sensitive Unique-Index von SQLite findet die alte Zeile nicht, und der
-- Nutzer würde stattdessen ein zweites, leeres Konto anlegen.

-- Schritt 1: Kollisionen auflösen. Existieren "Anna@x.de" und "anna@x.de"
-- bereits nebeneinander, kann nur eine Zeile die normalisierte Adresse
-- behalten. Die älteste (= das zuerst angelegte Konto mit seinen
-- Mitgliedschaften) gewinnt; jüngere Duplikate bekommen ihre alte Adresse mit
-- Suffix, damit der Unique-Index hält und keine Daten verloren gehen.
UPDATE "User"
SET "email" = "email" || '.dup-' || "id"
WHERE EXISTS (
  SELECT 1 FROM "User" AS keep
  WHERE lower(keep."email") = lower("User"."email")
    AND keep."id" <> "User"."id"
    AND (keep."createdAt" < "User"."createdAt"
         OR (keep."createdAt" = "User"."createdAt" AND keep."id" < "User"."id"))
);

-- Schritt 2: die verbleibenden Adressen normalisieren.
UPDATE "User" SET "email" = lower("email") WHERE "email" <> lower("email");
