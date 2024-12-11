"use client";

import { updateLenderAction } from "@/actions/update-lender-action";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

interface LenderFormData {
  id: string;
  name: string;
  status: string;
  trailRate: number;
  aliases: string[];
}

export default function UpdateLenderForm() {
  const [formData, setFormData] = useState<LenderFormData>({
    id: "",
    name: "",
    status: "active",
    trailRate: 0,
    aliases: [],
  });

  const { execute, status, result } = useAction(updateLenderAction);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await execute(formData);

    if (result?.data) {
      // Handle success (e.g., show success message, reset form)
      console.log("Lender updated successfully");
    }
  };

  const handleAliasChange = (value: string) => {
    // Split comma-separated string into array
    const aliasArray = value.split(",").map((alias) => alias.trim());
    setFormData((prev) => ({ ...prev, aliases: aliasArray }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-4">
      <div>
        <label htmlFor="id" className="block text-sm font-medium text-gray-700">
          Lender ID
        </label>
        <input
          type="text"
          id="id"
          value={formData.id}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, id: e.target.value }))
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
          required
        />
      </div>

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
          required
        />
      </div>

      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium text-gray-700"
        >
          Status
        </label>
        <select
          id="status"
          value={formData.status}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, status: e.target.value }))
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="trailRate"
          className="block text-sm font-medium text-gray-700"
        >
          Trail Rate
        </label>
        <input
          type="number"
          id="trailRate"
          value={formData.trailRate}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              trailRate: parseFloat(e.target.value),
            }))
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
          step="0.01"
          required
        />
      </div>

      <div>
        <label
          htmlFor="aliases"
          className="block text-sm font-medium text-gray-700"
        >
          Aliases (comma-separated)
        </label>
        <input
          type="text"
          id="aliases"
          value={formData.aliases.join(", ")}
          onChange={(e) => handleAliasChange(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
          placeholder="alias1, alias2, alias3"
        />
      </div>

      <button
        type="submit"
        disabled={status === "executing"}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
      >
        {status === "executing" ? "Updating..." : "Update Lender"}
      </button>

      {result?.validationError && (
        <div className="text-red-500 text-sm">
          {Object.values(result.validationError).map((error, i) => (
            <p key={i}>{error}</p>
          ))}
        </div>
      )}

      {result?.serverError && (
        <div className="text-red-500 text-sm">{result.serverError}</div>
      )}
    </form>
  );
}
