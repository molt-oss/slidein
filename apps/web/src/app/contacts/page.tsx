import { fetchContacts } from "@/lib/api";
import { safeFetch } from "@/lib/safe-fetch";
import type { Contact } from "@/lib/api";
import { ContactsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const { data, error } = await safeFetch<Contact[]>(
    () => fetchContacts(),
    [],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Contacts</h1>
      {error && (
        <div className="mt-4 rounded-md border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-400">
          ⚠️ Could not load contacts.
        </div>
      )}
      <ContactsClient initialContacts={data} />
    </div>
  );
}
