"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/badge";
import { updateScenario, type ScenarioWithSteps } from "@/lib/api";
import { useToast } from "@/components/toast";

interface StepInput {
  stepOrder: number;
  messageText: string;
  delaySeconds: number;
  conditionTag: string | null;
}

function formatDelay(seconds: number): string {
  if (seconds === 0) return "Immediately";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

export function ScenarioDetailClient({
  scenario,
}: {
  scenario: ScenarioWithSteps;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [steps, setSteps] = useState<StepInput[]>(
    scenario.steps
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map((s) => ({
        stepOrder: s.stepOrder,
        messageText: s.messageText,
        delaySeconds: s.delaySeconds,
        conditionTag: s.conditionTag,
      })),
  );
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(scenario.name);
  const [enabled, setEnabled] = useState(scenario.enabled);

  const addStep = () => {
    setSteps([
      ...steps,
      {
        stepOrder: steps.length + 1,
        messageText: "",
        delaySeconds: 3600,
        conditionTag: null,
      },
    ]);
  };

  const removeStep = (index: number) => {
    const next = steps
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, stepOrder: i + 1 }));
    setSteps(next);
  };

  const moveStep = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    setSteps(next.map((s, i) => ({ ...s, stepOrder: i + 1 })));
  };

  const updateStep = (index: number, field: keyof StepInput, value: string | number | null) => {
    const next = [...steps];
    next[index] = { ...next[index], [field]: value };
    setSteps(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateScenario(scenario.id, { name, enabled, steps });
      router.refresh();
      showToast("Scenario saved", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/scenarios")}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold">Edit Scenario</h1>
      </div>

      <div className="mt-6 space-y-4">
        {/* Name & Enable */}
        <div className="flex items-center gap-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Scenario name"
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          />
          <button
            onClick={() => setEnabled(!enabled)}
            className="text-sm"
          >
            <Badge variant={enabled ? "success" : "warning"}>
              {enabled ? "Active" : "Disabled"}
            </Badge>
          </button>
        </div>

        <div className="text-xs text-zinc-500">
          Trigger: {scenario.triggerType}
          {scenario.triggerValue ? ` → "${scenario.triggerValue}"` : ""}
        </div>

        {/* Steps */}
        <h2 className="text-lg font-semibold text-zinc-300">Steps</h2>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div
              key={i}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-500">
                  Step {step.stepOrder}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => moveStep(i, -1)}
                    disabled={i === 0}
                    className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveStep(i, 1)}
                    disabled={i === steps.length - 1}
                    className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeStep(i)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <textarea
                value={step.messageText}
                onChange={(e) => updateStep(i, "messageText", e.target.value)}
                rows={2}
                aria-label={`Step ${step.stepOrder} message text`}
                className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                placeholder="Message text"
              />

              <div className="mt-2 flex items-center gap-3">
                <label className="text-xs text-zinc-400">Delay:</label>
                <input
                  type="number"
                  min="0"
                  value={step.delaySeconds}
                  onChange={(e) =>
                    updateStep(i, "delaySeconds", Number(e.target.value))
                  }
                  aria-label={`Step ${step.stepOrder} delay seconds`}
                  className="w-24 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100"
                />
                <span className="text-xs text-zinc-500">
                  seconds ({formatDelay(step.delaySeconds)})
                </span>

                <label className="ml-4 text-xs text-zinc-400">
                  Condition tag:
                </label>
                <input
                  value={step.conditionTag ?? ""}
                  onChange={(e) =>
                    updateStep(
                      i,
                      "conditionTag",
                      e.target.value || null,
                    )
                  }
                  placeholder="Optional"
                  aria-label={`Step ${step.stepOrder} condition tag`}
                  className="w-32 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 placeholder-zinc-600"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addStep}
          className="rounded-md border border-dashed border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-brand-500 hover:text-brand-400"
        >
          + Add Step
        </button>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving || steps.length === 0}
            className="rounded-md bg-brand-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
