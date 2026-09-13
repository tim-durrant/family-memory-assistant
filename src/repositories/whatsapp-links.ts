type LinkRow = {
  id: string;
  person_id: string;
  person_name: string;
  owner_person_id: string;
  code: string;
  proposed_whatsapp_id: string | null;
  status: "pending" | "proposed";
};

export async function createWhatsAppLink(
  db: D1Database,
  ownerPersonId: string,
  personName: string,
): Promise<{ ok: true; personName: string; code: string } | { ok: false; reason: string }> {
  const owner = await db.prepare(
    "SELECT role FROM people WHERE id = ?1 AND active = 1 AND is_sender = 1 LIMIT 1",
  ).bind(ownerPersonId).first<{ role: string }>();
  if (owner?.role !== "owner") return { ok: false, reason: "Only the family administrator can link a WhatsApp number." };

  const person = await db.prepare(
    `SELECT id, display_name, is_sender
     FROM people WHERE active = 1 AND lower(display_name) = lower(?1) LIMIT 1`,
  ).bind(personName.trim()).first<{ id: string; display_name: string; is_sender: number }>();
  if (!person) return { ok: false, reason: `I don’t know ${personName.trim()} yet.` };
  if (person.is_sender === 1) return { ok: false, reason: `${person.display_name} already has an active WhatsApp number.` };

  const code = `LINK-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const now = new Date();
  const expires = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
  await db.prepare(
    `INSERT INTO pending_whatsapp_links
     (id, person_id, owner_person_id, code, status, created_at, expires_at)
     VALUES (?1, ?2, ?3, ?4, 'pending', ?5, ?6)`,
  ).bind(crypto.randomUUID(), person.id, ownerPersonId, code, now.toISOString(), expires).run();
  return { ok: true, personName: person.display_name, code };
}

export async function acceptWhatsAppLinkCode(
  db: D1Database,
  code: string,
  proposedWhatsAppId: string,
): Promise<{ ownerWhatsAppId: string; personName: string } | null> {
  const link = await db.prepare(
    `SELECT l.id, p.display_name AS person_name, owner.whatsapp_id AS owner_whatsapp_id
     FROM pending_whatsapp_links l
     JOIN people p ON p.id = l.person_id
     JOIN people owner ON owner.id = l.owner_person_id
     WHERE l.code = ?1 AND l.status = 'pending' AND l.expires_at > ?2
     LIMIT 1`,
  ).bind(code.trim().toUpperCase(), new Date().toISOString()).first<{ id: string; person_name: string; owner_whatsapp_id: string }>();
  if (!link) return null;
  await db.prepare(
    `UPDATE pending_whatsapp_links
     SET proposed_whatsapp_id = ?1, status = 'proposed'
     WHERE id = ?2 AND status = 'pending'`,
  ).bind(proposedWhatsAppId, link.id).run();
  return { ownerWhatsAppId: link.owner_whatsapp_id, personName: link.person_name };
}

export async function confirmWhatsAppLink(
  db: D1Database,
  ownerPersonId: string,
  personName: string,
): Promise<{ ok: true; personName: string } | { ok: false; reason: string }> {
  const owner = await db.prepare(
    "SELECT role FROM people WHERE id = ?1 AND active = 1 AND is_sender = 1 LIMIT 1",
  ).bind(ownerPersonId).first<{ role: string }>();
  if (owner?.role !== "owner") return { ok: false, reason: "Only the family administrator can confirm a WhatsApp link." };

  const link = await db.prepare(
    `SELECT l.id, l.person_id, l.proposed_whatsapp_id, p.display_name AS person_name
     FROM pending_whatsapp_links l JOIN people p ON p.id = l.person_id
     WHERE l.owner_person_id = ?1 AND lower(p.display_name) = lower(?2)
       AND l.status = 'proposed' AND l.expires_at > ?3
     ORDER BY l.created_at DESC LIMIT 1`,
  ).bind(ownerPersonId, personName.trim(), new Date().toISOString()).first<LinkRow>();
  if (!link?.proposed_whatsapp_id) return { ok: false, reason: `I don’t have a verified WhatsApp link waiting for ${personName.trim()}.` };

  const now = new Date().toISOString();
  try {
    await db.batch([
      db.prepare(
        `UPDATE people SET whatsapp_id = ?1, is_sender = 1, updated_at = ?2 WHERE id = ?3 AND is_sender = 0`,
      ).bind(link.proposed_whatsapp_id, now, link.person_id),
      db.prepare(
        `UPDATE pending_whatsapp_links SET status = 'confirmed', confirmed_at = ?1 WHERE id = ?2 AND status = 'proposed'`,
      ).bind(now, link.id),
    ]);
  } catch {
    return { ok: false, reason: "I couldn’t complete that link. The number may already belong to another person." };
  }
  return { ok: true, personName: link.person_name };
}

export function extractWhatsAppLinkCode(text: string): string | null {
  const match = text.trim().match(/^LINK-[A-Z0-9]{8}$/i);
  return match?.[0].toUpperCase() ?? null;
}
