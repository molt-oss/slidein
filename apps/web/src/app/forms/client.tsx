"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  createForm,
  deleteForm,
  fetchFormResponses,
  type Form,
  type FormField,
  type FormResponse,
} from "@/lib/api";
import { useToast } from "@/components/toast";

export function FormsClient({
  initialForms,
}: {
  initialForms: Form[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<FormField[]>([
    { label: "", type: "text", key: "" },
  ]);
  const [responses, setResponses] = useState<{
    formName: string;
    data: FormResponse[];
  } | null>(null);

  const addField = () => {
    setFields([...fields, { label: "", type: "text", key: "" }]);
  };

  const updateField = (idx: number, key: keyof FormField, value: string) => {
    const next = [...fields];
    next[idx] = { ...next[idx], [key]: value } as FormField;
    setFields(next);
  };

  const removeField = (idx: number) => {
    setFields(fields.filter((_, i) => i !== idx));
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createForm({
        name: fd.get("name") as string,
        fields: fields.filter((f) => f.label && f.key),
        thankYouMessage: (fd.get("thankYouMessage") as string) || undefined,
      });
      setShowForm(false);
      setFields([{ label: "", type: "text", key: "" }]);
      router.refresh();
      showToast("Form created", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteForm(deleteTarget);
      setDeleteTarget(null);
      router.refresh();
      showToast("Form deleted", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleViewResponses = async (form: Form) => {
    try {
      const result = await fetchFormResponses(form.id);
      setResponses({ formName: form.name, data: result.data });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load");
    }
  };

  const columns = [
    { key: "name", label: "Name" },
    {
      key: "fields",
      label: "Fields",
      render: (r: Form) => (
        <span className="text-sm text-zinc-400">{r.fields.length} field(s)</span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (r: Form) => (
        <span className="text-xs text-zinc-500">
          {new Date(r.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r: Form) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewResponses(r)}
            className="text-xs text-brand-400 hover:text-brand-300"
          >
            Responses
          </button>
          <button
            onClick={() => setDeleteTarget(r.id)}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {initialForms.length} form(s)
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          {showForm ? "Cancel" : "+ New Form"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3"
        >
          <div>
            <label htmlFor="fm-name" className="mb-1 block text-xs text-zinc-400">Form Name</label>
            <input
              id="fm-name"
              name="name"
              placeholder="e.g. Survey"
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Fields</label>
            {fields.map((f, idx) => (
              <div key={idx} className="mb-2 flex gap-2">
                <input
                  placeholder="Label (question)"
                  value={f.label}
                  onChange={(e) => updateField(idx, "label", e.target.value)}
                  className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
                />
                <input
                  placeholder="Key"
                  value={f.key}
                  onChange={(e) => updateField(idx, "key", e.target.value)}
                  className="w-28 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
                />
                <select
                  value={f.type}
                  onChange={(e) => updateField(idx, "type", e.target.value)}
                  className="w-24 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-zinc-100"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="email">Email</option>
                </select>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeField(idx)}
                    className="text-red-400 hover:text-red-300"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addField}
              className="text-xs text-brand-400 hover:text-brand-300"
            >
              + Add Field
            </button>
          </div>
          <div>
            <label htmlFor="fm-thanks" className="mb-1 block text-xs text-zinc-400">
              Thank You Message
            </label>
            <input
              id="fm-thanks"
              name="thankYouMessage"
              placeholder="Thank you!"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Form"}
          </button>
        </form>
      )}

      {responses && (
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-100">
              Responses: {responses.formName}
            </h3>
            <button
              onClick={() => setResponses(null)}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Close
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {responses.data.length === 0 ? (
              <p className="text-sm text-zinc-500">No responses yet.</p>
            ) : (
              responses.data.map((r) => (
                <div
                  key={r.id}
                  className="rounded border border-zinc-700 bg-zinc-800 p-3"
                >
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>Contact: {r.contactId}</span>
                    <Badge variant={r.completedAt ? "success" : "warning"}>
                      {r.completedAt ? "Complete" : "In Progress"}
                    </Badge>
                  </div>
                  <pre className="mt-1 text-xs text-zinc-300">
                    {JSON.stringify(r.responses, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={initialForms}
          keyField="id"
          emptyMessage="No forms yet."
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Form"
        message="Are you sure? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
