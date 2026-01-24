import { useState, useEffect } from "react";
import type { SetsQueryState } from "../../types";
import { useSets, useIntersectionObserver } from "./hooks";
import { FiltersBar } from "./FiltersBar";
import { SetsGrid } from "./SetsGrid";
import { CreateSetModal } from "./CreateSetModal";

/**
 * Main container component for the Sets list page.
 * Manages query state, filters, and renders the sets grid with infinite scroll.
 */
export function SetsPage() {
  const [query, setQuery] = useState<SetsQueryState>({
    search: undefined,
    level: undefined,
    cursor: undefined,
    limit: 10,
    sort: "created_at_desc",
  });

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Check URL for mode=create parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "create") {
      setShowCreateModal(true);
      // Remove the query parameter from URL without reloading
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const { data, loading, error, loadNextPage } = useSets(query);

  // Infinite scroll observer
  const loadMoreRef = useIntersectionObserver({
    onIntersect: loadNextPage,
    enabled: !!data?.nextCursor && !loading,
  });

  // Handle filter changes
  const handleQueryChange = (partial: Partial<SetsQueryState>) => {
    setQuery((prev) => ({
      ...prev,
      ...partial,
      cursor: undefined, // Reset cursor when filters change
    }));
  };

  // Handle card actions
  const handleSelect = (id: string) => {
    // TODO: Navigate to exercise session or start new session
    console.log("Select set:", id);
    window.location.href = `/app/sets/${id}`;
  };

  const handleEdit = (id: string) => {
    // TODO: Navigate to edit page
    console.log("Edit set:", id);
    window.location.href = `/app/sets/${id}/edit`;
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/sets/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();

        if (response.status === 409 && error.error.code === "ACTIVE_SESSION") {
          alert("Nie można usunąć zestawu w trakcie aktywnej sesji. Najpierw zakończ ćwiczenia.");
          return;
        }

        throw new Error(error.error.message || "Nie udało się usunąć zestawu");
      }

      // Optimistic update - remove from list
      // Refetch would be cleaner but this is faster for UX
      window.location.reload();
    } catch (error) {
      console.error("Error deleting set:", error);
      alert(error instanceof Error ? error.message : "Wystąpił błąd podczas usuwania zestawu");
    }
  };

  const handleCreateSuccess = () => {
    // Reload the page to show the new set
    window.location.reload();
  };

  return (
    <>
      {/* Create Set Modal */}
      <CreateSetModal open={showCreateModal} onOpenChange={setShowCreateModal} onSuccess={handleCreateSuccess} />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Moje Zestawy</h1>
              <p className="text-gray-600 mt-1">Zarządzaj swoimi zestawami słówek i rozpocznij ćwiczenia</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Utwórz zestaw
            </button>
          </div>
        </header>

        {/* Filters Bar */}
        <div className="mb-6">
          <FiltersBar search={query.search} level={query.level} onChange={handleQueryChange} />
        </div>

        {/* Error Display */}
        {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">{error}</div>}

        {/* Loading State */}
        {loading && !data && (
          <div className="text-center py-12">
            <div className="text-gray-600">Ładowanie zestawów...</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && data && data.items.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-600 mb-4">Nie masz jeszcze żadnych zestawów</div>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => setShowCreateModal(true)}
            >
              Utwórz pierwszy zestaw
            </button>
          </div>
        )}

        {/* Sets Grid */}
        {data && data.items.length > 0 && (
          <div>
            <SetsGrid items={data.items} onSelect={handleSelect} onEdit={handleEdit} onDelete={handleDelete} />

            {/* Infinite Scroll Trigger */}
            {data.nextCursor && (
              <div ref={loadMoreRef} className="mt-8 text-center py-4">
                <div className="inline-flex items-center gap-2 text-gray-600">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Ładowanie...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
