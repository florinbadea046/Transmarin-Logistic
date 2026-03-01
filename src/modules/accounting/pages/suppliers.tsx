import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Supplier } from "@/modules/accounting/types";
import { STORAGE_KEYS } from "@/data/mock-data";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 5;

  useEffect(() => {
    const data = localStorage.getItem(STORAGE_KEYS.suppliers);
    if (data) {
      const parsed: Supplier[] = JSON.parse(data);
      setSuppliers(parsed);
    }
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

  const totalPages = Math.ceil(sortedSuppliers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;

  const paginatedSuppliers = sortedSuppliers.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <>
      <Header>
        <h1 className="text-lg font-semibold text-white">
          Furnizori
        </h1>
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
          <CardHeader>
            <CardTitle className="text-white">
              Gestiune Furnizori
            </CardTitle>
          </CardHeader>

          <CardContent>
            {suppliers.length === 0 ? (
              <div className="text-white">
                <p className="text-lg font-medium">
                  Nu există furnizori
                </p>
                <p className="text-sm text-gray-400">
                  Adaugă primul furnizor.
                </p>
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="text-white">
                <p className="text-lg font-medium">
                  Niciun rezultat găsit
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-white">
                    <thead>
                      <tr className="bg-slate-700 text-gray-200 text-sm uppercase tracking-wider">
                        <th className="p-3 text-left">Nume</th>
                        <th className="p-3 text-left">CUI</th>
                        <th className="p-3 text-left">Adresă</th>
                        <th className="p-3 text-left">Telefon</th>
                        <th className="p-3 text-left">Cont bancar</th>
                        <th className="p-3 text-left">Email</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedSuppliers.map((supplier) => (
                        <tr
                          key={supplier.id}
                          className="border-b border-slate-700 hover:bg-slate-800 transition-colors"
                        >
                          <td className="p-3 font-medium">
                            {supplier.name}
                          </td>
                          <td className="p-3 text-gray-300">
                            {supplier.cui}
                          </td>
                          <td className="p-3 text-gray-300">
                            {supplier.address}
                          </td>
                          <td className="p-3 text-gray-300">
                            {supplier.phone}
                          </td>
                          <td className="p-3 text-gray-300">
                            {supplier.bankAccount}
                          </td>
                          <td className="p-3 text-gray-300">
                            {supplier.email}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center mt-6 text-white">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-md border border-slate-600 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition"
                  >
                    Previous
                  </button>

                  <span className="text-gray-300">
                    Pagina {currentPage} din {totalPages}
                  </span>

                  <button
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(prev + 1, totalPages)
                      )
                    }
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-md border border-slate-600 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  );
}