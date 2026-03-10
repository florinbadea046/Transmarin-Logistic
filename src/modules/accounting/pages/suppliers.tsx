import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Supplier } from "@/modules/accounting/types";
import { STORAGE_KEYS } from "@/data/mock-data";
import { SupplierModal } from "../components/SupplierModal";
import { getCollection, setCollection } from "@/utils/local-storage";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] =
    useState<Supplier | null>(null);

  const itemsPerPage = 5;

  useEffect(() => {
    const suppliersFromStorage =
      getCollection<Supplier>(STORAGE_KEYS.suppliers);
    setSuppliers(suppliersFromStorage);
  }, []);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(normalizedSearch) ||
      supplier.cui.toLowerCase().includes(normalizedSearch)
  );

  const sortedSuppliers = [...filteredSuppliers].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const totalPages = Math.max(1, Math.ceil(sortedSuppliers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;

  const paginatedSuppliers = sortedSuppliers.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleSave = (supplier: Supplier) => {
    let updatedSuppliers: Supplier[];

    if (selectedSupplier) {
      updatedSuppliers = suppliers.map((s) =>
        s.id === supplier.id ? supplier : s
      );
    } else {
      const newSupplier = {
        ...supplier,
        id: crypto.randomUUID(),
      };
      updatedSuppliers = [...suppliers, newSupplier];
    }

    setSuppliers(updatedSuppliers);
    setCollection(STORAGE_KEYS.suppliers, updatedSuppliers);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const confirmDelete = confirm("Sigur vrei să ștergi acest furnizor?");
    if (!confirmDelete) return;

    const updatedSuppliers = suppliers.filter((s) => s.id !== id);
    setSuppliers(updatedSuppliers);
    setCollection(STORAGE_KEYS.suppliers, updatedSuppliers);
  };

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold text-white">Furnizori</h1>
      </Header>

      <Main>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Caută după nume sau CUI"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-md border border-gray-600 bg-slate-800 text-white p-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <Card className="bg-slate-900 border border-slate-700">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
            <CardTitle className="text-white">Gestiune Furnizori</CardTitle>
            <button
              onClick={() => {
                setSelectedSupplier(null);
                setIsModalOpen(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full md:w-auto"
            >
              + Adaugă Furnizor
            </button>
          </CardHeader>

          <CardContent>
            {suppliers.length === 0 ? (
              <p className="text-white">Nu există furnizori</p>
            ) : sortedSuppliers.length === 0 ? (
              <p className="text-white">Niciun furnizor găsit</p>
            ) : (
              <>
                <div className="flex flex-col gap-3 lg:hidden">
                  {paginatedSuppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      className="bg-slate-800 rounded-lg p-4 border border-slate-700"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-white font-semibold text-base">
                          {supplier.name}
                        </span>
                        <div className="flex gap-2 ml-2 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedSupplier(supplier);
                              setIsModalOpen(true);
                            }}
                            className="bg-yellow-500 px-2 py-1 rounded text-black text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(supplier.id)}
                            className="bg-red-600 px-2 py-1 rounded text-white text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-slate-300 space-y-1">
                        <p><span className="text-slate-400">CUI:</span> {supplier.cui}</p>
                        <p><span className="text-slate-400">Telefon:</span> {supplier.phone}</p>
                        <p><span className="text-slate-400">Email:</span> {supplier.email}</p>
                        <p><span className="text-slate-400">Adresă:</span> {supplier.address}</p>
                        <p><span className="text-slate-400">Cont bancar:</span> {supplier.bankAccount}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-white text-sm">
                    <thead className="bg-slate-700">
                      <tr>
                        <th className="p-3 text-left">Nume</th>
                        <th className="p-3 text-left">CUI</th>
                        <th className="p-3 text-left">Telefon</th>
                        <th className="p-3 text-left">Adresă</th>
                        <th className="p-3 text-left">Cont bancar</th>
                        <th className="p-3 text-left">Email</th>
                        <th className="p-3 text-left">Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSuppliers.map((supplier) => (
                        <tr
                          key={supplier.id}
                          className="border-b border-slate-700 hover:bg-slate-800"
                        >
                          <td className="p-3">{supplier.name}</td>
                          <td className="p-3">{supplier.cui}</td>
                          <td className="p-3">{supplier.phone}</td>
                          <td className="p-3">{supplier.address}</td>
                          <td className="p-3">{supplier.bankAccount}</td>
                          <td className="p-3">{supplier.email}</td>
                          <td className="p-3 flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedSupplier(supplier);
                                setIsModalOpen(true);
                              }}
                              className="bg-yellow-500 px-3 py-1 rounded text-black text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(supplier.id)}
                              className="bg-red-600 px-3 py-1 rounded text-white text-sm"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center mt-4 text-white gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40 min-w-[80px]"
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </button>
                  <span className="text-xs text-center">
                    Pagina {currentPage} din {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(prev + 1, totalPages)
                      )
                    }
                    className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40 min-w-[80px]"
                    disabled={currentPage === totalPages}
                  >
                    Următor
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Main>

      {isModalOpen && (
        <SupplierModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialData={selectedSupplier}
          onSave={handleSave}
        />
      )}
    </>
  );
}