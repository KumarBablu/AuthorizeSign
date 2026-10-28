import fs from 'node:fs';
import path from 'node:path';

export interface DevDbData {
  documents: Record<string, any>;
  signers: Record<string, any>;
  fields: Record<string, any>;
  otp_challenges: Record<string, any>;
  signatures: Record<string, any>;
  audit_events: Array<any>;
}

const DB_FILE = path.resolve(process.cwd(), '.storage', 'dev_db.json');

function loadDb(): DevDbData {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading dev db:', err);
  }
  return {
    documents: {},
    signers: {},
    fields: {},
    otp_challenges: {},
    signatures: {},
    audit_events: [],
  };
}

function saveDb(data: DevDbData) {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving dev db:', err);
  }
}

export const devDb = {
  isDevMode(): boolean {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    return !url || url.includes('your-project-ref');
  },

  getDocuments(orgId: string, status?: string) {
    const db = loadDb();
    let docs = Object.values(db.documents).filter((d) => d.organization_id === orgId);
    if (status) {
      docs = docs.filter((d) => d.status === status);
    }
    return docs.map((d) => ({
      ...d,
      signers: Object.values(db.signers).filter((s) => s.document_id === d.id),
    }));
  },

  getDocumentById(id: string) {
    const db = loadDb();
    const doc = db.documents[id];
    if (!doc) return null;
    return {
      ...doc,
      signers: Object.values(db.signers).filter((s) => s.document_id === id),
      fields: Object.values(db.fields).filter((f) => f.document_id === id),
      signatures: Object.values(db.signatures).filter((sig) => sig.document_id === id),
      audit_events: db.audit_events.filter((a) => a.document_id === id),
    };
  },

  insertDocument(doc: any) {
    const db = loadDb();
    db.documents[doc.id] = { ...doc };
    saveDb(db);
    return doc;
  },

  updateDocument(id: string, updates: any) {
    const db = loadDb();
    if (db.documents[id]) {
      db.documents[id] = { ...db.documents[id], ...updates };
      saveDb(db);
    }
    return db.documents[id];
  },

  insertSigners(signerList: any[]) {
    const db = loadDb();
    for (const s of signerList) {
      db.signers[s.id] = { ...s };
    }
    saveDb(db);
  },

  updateSigner(id: string, updates: any) {
    const db = loadDb();
    if (db.signers[id]) {
      db.signers[id] = { ...db.signers[id], ...updates };
      saveDb(db);
    }
    return db.signers[id];
  },

  getSignerByTokenHash(tokenHash: string) {
    const db = loadDb();
    const signer = Object.values(db.signers).find((s) => s.token_hash === tokenHash);
    if (!signer) return null;
    const doc = db.documents[signer.document_id];
    return {
      ...signer,
      documents: {
        ...doc,
        organizations: { name: 'Acme Corp' },
      },
    };
  },

  getSignersForDocument(docId: string) {
    const db = loadDb();
    return Object.values(db.signers)
      .filter((s) => s.document_id === docId)
      .sort((a, b) => a.order_index - b.order_index);
  },

  insertFields(fieldList: any[]) {
    const db = loadDb();
    for (const f of fieldList) {
      db.fields[f.id || crypto.randomUUID()] = { ...f };
    }
    saveDb(db);
  },

  getFieldsForSigner(docId: string, signerId: string) {
    const db = loadDb();
    return Object.values(db.fields).filter(
      (f) => f.document_id === docId && f.signer_id === signerId
    );
  },

  insertOtpChallenge(challenge: any) {
    const db = loadDb();
    const id = challenge.id || crypto.randomUUID();
    db.otp_challenges[id] = { ...challenge, id };
    saveDb(db);
    return db.otp_challenges[id];
  },

  getRecentOtpChallenges(signerId: string, sinceIso: string) {
    const db = loadDb();
    return Object.values(db.otp_challenges).filter(
      (c) => c.signer_id === signerId && c.created_at >= sinceIso
    );
  },

  getActiveOtpChallenge(signerId: string) {
    const db = loadDb();
    const challenges = Object.values(db.otp_challenges).filter(
      (c) => c.signer_id === signerId && !c.consumed_at
    );
    challenges.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return challenges[0] || null;
  },

  updateOtpChallenge(id: string, updates: any) {
    const db = loadDb();
    if (db.otp_challenges[id]) {
      db.otp_challenges[id] = { ...db.otp_challenges[id], ...updates };
      saveDb(db);
    }
  },

  insertSignature(sig: any) {
    const db = loadDb();
    const id = sig.id || crypto.randomUUID();
    db.signatures[id] = { ...sig, id };
    saveDb(db);
  },

  insertAuditEvent(event: any) {
    const db = loadDb();
    db.audit_events.push({
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...event,
    });
    saveDb(db);
  },

  findDocumentBySignedSha256(hash: string) {
    const db = loadDb();
    return Object.values(db.documents).find(
      (d) => d.signed_sha256?.toLowerCase() === hash.toLowerCase() && d.status === 'completed'
    );
  },
};
